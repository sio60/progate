package com.kfood.kfood_be.recipes.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kfood.kfood_be.recipes.dto.RecipeResponseDto;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecipeService {

    private final GeminiService geminiService;
    private final PromptFactory promptFactory; // 기존 의존성 유지
    private final ObjectMapper om = new ObjectMapper();

    private static final String NUM =
            "(?:\\d+(?:[.,]\\d+)?|\\d+\\s+\\d+/\\d+|\\d+/\\d+|[½¼¾⅓⅔])";
    private static final String UNIT =
            "(L|l|리터|ml|밀리리터|컵|cups?|cup|큰\\s*술|큰술|tbsp|tbs|T|작은\\s*술|작은술|tsp|teaspoons?|teaspoon|g|그램|kg|킬로그램|ea|pcs?|piece|pieces|개|pinch|꼬집)";
    private static final Pattern P_NAME_NUM_UNIT_END =
            Pattern.compile("^(.*?)\\s*(" + NUM + ")\\s*" + UNIT + "\\s*$", Pattern.CASE_INSENSITIVE);
    private static final Pattern P_NUM_UNIT_NAME_START =
            Pattern.compile("^(" + NUM + ")\\s*" + UNIT + "\\s*(.+)$", Pattern.CASE_INSENSITIVE);

    private static Double fractionToDouble(String s) {
        if (s == null) return null;
        s = s.trim();
        switch (s) {
            case "½": return 0.5;
            case "¼": return 0.25;
            case "¾": return 0.75;
            case "⅓": return 1.0/3.0;
            case "⅔": return 2.0/3.0;
        }
        Matcher mix = Pattern.compile("^(\\d+)\\s+(\\d+)/(\\d+)$").matcher(s);
        if (mix.find()) return Double.parseDouble(mix.group(1))
                + Double.parseDouble(mix.group(2)) / Double.parseDouble(mix.group(3));
        Matcher frac = Pattern.compile("^(\\d+)/(\\d+)$").matcher(s);
        if (frac.find()) return Double.parseDouble(frac.group(1)) / Double.parseDouble(frac.group(2));
        try { return Double.parseDouble(s.replace(",", ".")); } catch (Exception ignore) {}
        return null;
    }

    private static String normalizeUnit(String unitRaw) {
        if (unitRaw == null) return null;
        String u = unitRaw.trim().toLowerCase(Locale.ROOT);
        switch (u) {
            case "l": case "liter": case "litre": case "liters": case "litres": case "리터": return "L";
            case "ml": case "밀리리터": case "milliliter": case "milliliters": return "ml";
            case "cup": case "cups": case "컵": return "컵";
            case "tbsp": case "tbs": case "t": case "tablespoon": case "tablespoons": case "큰 술": case "큰술": return "큰술";
            case "tsp": case "teaspoon": case "teaspoons": case "작은 술": case "작은술": return "작은술";
            case "g": case "그램": return "g";
            case "kg": case "킬로그램": return "kg";
            case "ea": case "pc": case "pcs": case "piece": case "pieces": case "개": return "개";
            case "pinch": case "꼬집": return "꼬집";
        }
        return unitRaw;
    }

    private static RecipeResponseDto.Ingredient normalizeQtyUnit(RecipeResponseDto.Ingredient ing) {
        if (ing == null) return null;
        String unit = normalizeUnit(ing.getUnit());
        Double qty = ing.getQty();
        if (qty != null && "kg".equals(unit)) { qty = qty * 1000.0; unit = "g"; }
        ing.setQty(qty);
        ing.setUnit(unit);
        return ing;
    }

    private static RecipeResponseDto.Ingredient parseIngredientText(String s) {
        if (s == null) return null;
        String line = s.replaceAll("[•·\\-–—]", " ")
                       .replaceAll("\\s+", " ")
                       .replaceAll("\\([^)]*\\)", "")
                       .trim();

        Matcher m1 = P_NAME_NUM_UNIT_END.matcher(line);
        if (m1.find()) {
            String name = m1.group(1).trim();
            Double qty = fractionToDouble(m1.group(2));
            String unit = normalizeUnit(m1.group(3));
            return normalizeQtyUnit(RecipeResponseDto.Ingredient.builder()
                    .name(name).qty(qty).unit(unit).build());
        }
        Matcher m2 = P_NUM_UNIT_NAME_START.matcher(line);
        if (m2.find()) {
            Double qty = fractionToDouble(m2.group(1));
            String unit = normalizeUnit(m2.group(2));
            String name = m2.group(3).trim();
            return normalizeQtyUnit(RecipeResponseDto.Ingredient.builder()
                    .name(name).qty(qty).unit(unit).build());
        }
        return RecipeResponseDto.Ingredient.builder().name(line).qty(null).unit(null).build();
    }

    private static double roundSmart(double v) { return Math.round(v * 10.0) / 10.0; }
    private static String fmt1(double v){ return String.format(java.util.Locale.US, "%.1f", v); }

    private static String formatQtyAndUnit(Double qty, String unit){
        if(qty == null || unit == null || unit.isBlank()) return "";
        String u = normalizeUnit(unit);
        double q = qty;
        if ("kg".equals(u)) { q *= 1000.0; u = "g"; }
        if ("컵".equals(u)) {
            double ml = q * 200.0;
            return ml >= 1000.0 ? fmt1(ml/1000.0) + " L" : fmt1(ml) + " ml";
        }
        if ("ml".equals(u)) return q >= 1000.0 ? fmt1(q/1000.0) + " L" : fmt1(q) + " ml";
        if ("L".equals(u))  return fmt1(q) + " L";
        return fmt1(q) + " " + u;
    }
    private static String buildLabel(String name, Double qty, String unit){
        String base = name == null ? "" : name.trim();
        String tail = formatQtyAndUnit(qty, unit);
        return tail.isEmpty() ? base : (base.isEmpty() ? tail : base + " " + tail);
    }

    // ========= 퍼블릭 API =========
    public List<RecipeResponseDto> generateRecipes(List<String> ingredients) {
        return generateRecipes(ingredients, null, null);
    }

    public List<RecipeResponseDto> generateRecipes(List<String> ingredients, Integer timeMax, Integer servings) {
        if (ingredients == null || ingredients.isEmpty()) return Collections.emptyList();
        final String prompt = promptFactory.buildRecipePrompt(ingredients, timeMax, servings);

        String jsonStrict = geminiService.generateMeasuredRecipe(prompt);
        List<RecipeResponseDto> parsed = coerceOneServing(parseAny(jsonStrict));
        if (parsed != null && !parsed.isEmpty()) return parsed;

        String text = geminiService.generateText(prompt, 0.2);
        parsed = coerceOneServing(parseAny(text));
        if (parsed != null && !parsed.isEmpty()) return parsed;

        text = geminiService.generateText(prompt, 0.7);
        parsed = coerceOneServing(parseAny(text));
        if (parsed != null && !parsed.isEmpty()) return parsed;

        log.warn("레시피 생성 실패: 모델 응답 파싱 불가");
        return Collections.emptyList();
    }

    // 이름 검색 (스토리지 없으면 임시로 빈 리스트)
    public List<RecipeResponseDto> searchRecipeByName(String query) {
        return Collections.emptyList();
    }

    // ========= 파싱 =========
    private List<RecipeResponseDto> parseAny(String text) {
        try {
            if (text == null || text.isBlank()) return Collections.emptyList();
            String cleaned = text.replaceAll("```json\\s*", "")
                                 .replaceAll("```\\s*", "")
                                 .trim();
            JsonNode node = om.readTree(cleaned);
            return nodeToList(node);
        } catch (Exception e) {
            log.warn("모델 JSON 파싱 실패(1차): {}", e.toString());
            String fixed = tryBalanceJson(text); // ← 복구 시도
            if (fixed != null) {
                try {
                    JsonNode node = om.readTree(fixed);
                    return nodeToList(node);
                } catch (Exception e2) {
                    log.warn("모델 JSON 파싱 실패(2차): {}", e2.toString());
                }
            }
        }
        return Collections.emptyList();
    }

    private List<RecipeResponseDto> nodeToList(JsonNode node) {
        if (node.isArray()) {
            List<RecipeResponseDto> out = new ArrayList<>();
            for (JsonNode n : node) out.add(fromNode(n));
            return out.stream().filter(Objects::nonNull).collect(Collectors.toList());
        } else if (node.isObject()) {
            RecipeResponseDto dto = fromNode(node);
            return dto == null ? Collections.emptyList() : List.of(dto);
        }
        return Collections.emptyList();
    }

    private String tryBalanceJson(String raw) {
        if (raw == null) return null;
        String s = raw.replaceAll("```json\\s*", "")
                      .replaceAll("```\\s*", "")
                      .trim();
        int start = s.indexOf('{');
        int end   = s.lastIndexOf('}');
        if (start < 0 || end < 0 || end <= start) return null;
        s = s.substring(start, end + 1);

        int bal = 0, lastPos = -1;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '{') bal++;
            else if (c == '}') { bal--; if (bal == 0) lastPos = i; }
        }
        if (lastPos >= 0) return s.substring(0, lastPos + 1);
        return null;
    }

    private RecipeResponseDto fromNode(JsonNode n) {
        if (n == null || !n.isObject()) return null;

        String title = n.path("title").asText(null);
        if (title == null) return null;

        List<RecipeResponseDto.Ingredient> ings = parseIngredients(n.path("ingredients"));
        if (ings.isEmpty()) {
            String ingText = n.path("ingredient").asText(null);
            if (ingText != null && !ingText.isBlank()) {
                ings = parseIngredientsFromString(ingText);
            }
        }

        RecipeResponseDto dto = RecipeResponseDto.builder()
                .title(title)
                .category(n.path("category").asText(null))
                .timeMin(n.hasNonNull("timeMin") ? n.get("timeMin").asInt() : null)
                .servings(n.hasNonNull("servings") ? n.get("servings").asInt() : null)
                .difficulty(n.path("difficulty").asText(null))
                .ingredients(ings)
                .steps(parseSteps(n.path("steps")))
                .chefNote(n.path("chefNote").asText(null))
                .tip(n.path("tip").asText(null))
                .build();

        enforceMeasuredDefaults(dto);
        return dto;
    }

    private List<RecipeResponseDto.Ingredient> parseIngredients(JsonNode arr) {
        if (arr == null || !arr.isArray()) return Collections.emptyList();
        List<RecipeResponseDto.Ingredient> out = new ArrayList<>();
        for (JsonNode x : arr) {
            if (x == null) continue;

            if (x.isObject()) {
                String name = x.path("name").asText(null);
                if (name == null || name.isBlank()) continue;

                Double qty = null;
                if (x.hasNonNull("qty")) {
                    JsonNode qn = x.get("qty");
                    if (qn.isNumber()) qty = qn.asDouble();
                    else if (qn.isTextual()) qty = fractionToDouble(qn.asText());
                }
                String unit  = normalizeUnit(x.path("unit").asText(null));
                String label = x.path("label").asText(null);

                RecipeResponseDto.Ingredient ing = RecipeResponseDto.Ingredient.builder()
                        .name(name).qty(qty).unit(unit).label(label).build();

                if (ing.getQty() == null || ing.getUnit() == null || ing.getUnit().isBlank()) {
                    RecipeResponseDto.Ingredient parsed = parseIngredientText(name);
                    if (parsed.getQty() != null && parsed.getUnit() != null) {
                        ing.setQty(parsed.getQty());
                        ing.setUnit(parsed.getUnit());
                        ing.setName(parsed.getName());
                    }
                }

                if (ing.getLabel() == null || ing.getLabel().isBlank()) {
                    ing.setLabel(buildLabel(ing.getName(), ing.getQty(), ing.getUnit()));
                }

                out.add(normalizeQtyUnit(ing));
                continue;
            }

            if (x.isTextual()) {
                RecipeResponseDto.Ingredient p = normalizeQtyUnit(parseIngredientText(x.asText()));
                if (p.getLabel() == null || p.getLabel().isBlank()) {
                    p.setLabel(buildLabel(p.getName(), p.getQty(), p.getUnit()));
                }
                out.add(p);
            }
        }
        return out;
    }

    private List<RecipeResponseDto.Ingredient> parseIngredientsFromString(String text) {
        List<RecipeResponseDto.Ingredient> out = new ArrayList<>();
        if (text == null) return out;
        String[] lines = text.split("\\r?\\n|,|·|•");
        for (String s : lines) {
            String t = s.trim();
            if (t.isEmpty()) continue;
            RecipeResponseDto.Ingredient p = normalizeQtyUnit(parseIngredientText(t));
            if (p.getLabel() == null || p.getLabel().isBlank()) {
                p.setLabel(buildLabel(p.getName(), p.getQty(), p.getUnit()));
            }
            out.add(p);
        }
        return out;
    }

    private List<RecipeResponseDto.Step> parseSteps(JsonNode arr) {
        if (arr == null || !arr.isArray()) return Collections.emptyList();
        List<RecipeResponseDto.Step> out = new ArrayList<>();
        int i = 1;
        for (JsonNode x : arr) {
            String txt = x.isObject() ? x.path("text").asText(null)
                    : (x.isTextual() ? x.asText() : null);
            if (txt == null || txt.isBlank()) continue;
            Integer order = (x.isObject() && x.hasNonNull("order")) ? x.get("order").asInt() : i++;
            out.add(RecipeResponseDto.Step.builder().order(order).text(txt).build());
        }
        return out;
    }

    // ========= 기본치 보정 & 1인분 환산 =========
    private void enforceMeasuredDefaults(RecipeResponseDto dto) {
        if (dto == null || dto.getIngredients() == null) return;
        List<RecipeResponseDto.Ingredient> fixed = new ArrayList<>();
        for (RecipeResponseDto.Ingredient ing : dto.getIngredients()) {
            if (ing == null) continue;
            String name = Optional.ofNullable(ing.getName()).orElse("").trim();
            Double qty = ing.getQty();
            String unit = ing.getUnit();

            if (qty == null || unit == null || unit.isBlank()) {
                double[] q = guessDefaultFor(name);
                if (q != null) {
                    qty = q[0];
                    unit = defaultUnitByCode((int) q[1]);
                }
            }
            RecipeResponseDto.Ingredient out = RecipeResponseDto.Ingredient.builder()
                    .name(name)
                    .qty(qty)
                    .unit(unit)
                    .label(buildLabel(name, qty, unit))
                    .build();

            fixed.add(out);
        }
        dto.setIngredients(fixed);
    }

    private String defaultUnitByCode(int code) {
        switch (code) {
            case 0: return "g";
            case 1: return "ml";
            case 2: return "L";
            case 3: return "큰술";
            case 4: return "작은술";
            case 5: return "컵";
            case 6: return "개";
            case 7: return "꼬집";
            default: return "g";
        }
    }

    private double[] guessDefaultFor(String name) {
        String s = name == null ? "" : name.toLowerCase(Locale.ROOT);
        if (s.contains("간장")) return new double[]{1.5, 3};
        if (s.contains("고춧가루")) return new double[]{0.5, 3};
        if (s.contains("설탕")) return new double[]{1.0, 4};
        if (s.contains("마늘")) return new double[]{1.0, 4};
        if (s.contains("참기름")) return new double[]{0.5, 3};
        if (s.contains("후추")) return new double[]{0.2, 4};
        if (s.contains("소금")) return new double[]{0.3, 4};
        if (s.contains("깨")) return new double[]{0.5, 4};
        if (s.contains("식용유") || s.contains("기름")) return new double[]{0.7, 3};
        if (s.contains("육수") || s.equals("물")) return new double[]{250.0, 1};
        if (s.contains("두부")) return new double[]{150.0, 0};
        if (s.contains("김치")) return new double[]{120.0, 0};
        if (s.contains("대파")) return new double[]{50.0, 0};
        if (s.contains("양파")) return new double[]{80.0, 0};
        if (s.contains("감자")) return new double[]{100.0, 0};
        if (s.contains("어묵")) return new double[]{80.0, 0};
        if (s.contains("떡")) return new double[]{120.0, 0};
        if (s.contains("면") || s.contains("소면") || s.contains("국수")) return new double[]{110.0, 0};
        if (s.contains("돼지고기") || s.contains("소고기") || s.contains("닭고기") || s.contains("고기"))
            return new double[]{130.0, 0};
        return null;
    }

    private List<RecipeResponseDto> coerceOneServing(List<RecipeResponseDto> list) {
        if (list == null) return Collections.emptyList();
        for (RecipeResponseDto dto : list) {
            Integer s = dto.getServings();
            int srcServ = (s == null || s <= 0) ? 1 : s;
            double factor = srcServ == 1 ? 1.0 : (1.0 / srcServ);

            if (dto.getIngredients() != null) {
                dto.setIngredients(
                    dto.getIngredients().stream().map(ing -> {
                        if (ing == null) return null;
                        Double q = ing.getQty();
                        if (q != null && factor != 1.0) ing.setQty(roundSmart(q * factor));
                        ing.setLabel(buildLabel(ing.getName(), ing.getQty(), ing.getUnit()));
                        return ing;
                    }).filter(Objects::nonNull).collect(Collectors.toList())
                );
            }
            dto.setServings(1);
        }
        return list;
    }

    // 로컬 폴백
    public RecipeResponseDto fallbackRecipe(List<String> ingredients) {
        List<RecipeResponseDto.Ingredient> ings = new ArrayList<>();
        for (String raw : ingredients) {
            String name = raw.trim();
            double[] g = guessDefaultFor(name);
            Double qty = g == null ? null : g[0];
            String unit = g == null ? null : defaultUnitByCode((int) g[1]);
            ings.add(RecipeResponseDto.Ingredient.builder()
                    .name(name)
                    .qty(qty)
                    .unit(unit)
                    .label(buildLabel(name, qty, unit))
                    .build());
        }
        List<RecipeResponseDto.Step> steps = List.of(
                RecipeResponseDto.Step.builder().order(1).text("팬을 중불로 달구고 식용유 0.5 큰술을 두른다.").build(),
                RecipeResponseDto.Step.builder().order(2).text("재료를 넣고 3~5분 볶는다(간은 소금 0.3 작은술).").build(),
                RecipeResponseDto.Step.builder().order(3).text("물 100~200 ml(또는 간장 1.0~1.5 큰술)로 간 맞춘다.").build()
        );
        return RecipeResponseDto.builder()
                .title(ingredients.get(0) + " 간단 요리")
                .category("기타")
                .timeMin(15)
                .servings(1)
                .difficulty("초급")
                .ingredients(ings)
                .steps(steps)
                .chefNote("제미나이 응답 실패 시 기본치로 구성된 임시 레시피입니다.")
                .tip("재료 상태에 따라 물/간장 수치를 ±20% 조절하세요.")
                .build();
    }
}
