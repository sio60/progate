package com.kfood.kfood_be.recipes.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
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
    private final PromptFactory promptFactory;
    private final ObjectMapper om = new ObjectMapper();

    public List<RecipeResponseDto> generateRecipes(List<String> ingredients) {
        return generateRecipes(ingredients, null, null);
    }

    public List<RecipeResponseDto> generateRecipes(List<String> ingredients, Integer timeMax, Integer servings) {
    if (ingredients == null || ingredients.isEmpty()) return Collections.emptyList();
    final String prompt = promptFactory.buildRecipePrompt(ingredients, timeMax, servings);

    // A. 스키마 강제(저온)
    String jsonStrict = geminiService.generateMeasuredRecipe(prompt);
    List<RecipeResponseDto> parsed = parseAny(jsonStrict);
    if (parsed != null && !parsed.isEmpty()) return parsed;

    // B. 일반 호출 2회 폴백
    String text = geminiService.generateText(prompt, 0.2);
    parsed = parseAny(text);
    if (parsed != null && !parsed.isEmpty()) return parsed;

    text = geminiService.generateText(prompt, 0.7);
    parsed = parseAny(text);
    if (parsed != null && !parsed.isEmpty()) return parsed;

    log.warn("레시피 생성 실패: 모델 응답 파싱 불가");
    return Collections.emptyList();
}

    // ---------------- 파싱 ----------------
    private List<RecipeResponseDto> parseAny(String text) {
        try {
            if (text == null || text.isBlank()) return Collections.emptyList();
            String cleaned = text.replaceAll("```json\\s*", "")
                                 .replaceAll("```\\s*", "")
                                 .trim();
            JsonNode node = om.readTree(cleaned);

            if (node.isArray()) {
                List<RecipeResponseDto> out = new ArrayList<>();
                for (JsonNode n : node) out.add(fromNode(n));
                return out.stream().filter(Objects::nonNull).collect(Collectors.toList());
            } else if (node.isObject()) {
                RecipeResponseDto dto = fromNode(node);
                return dto == null ? Collections.emptyList() : List.of(dto);
            }
        } catch (Exception e) {
            log.warn("모델 JSON 파싱 실패: {}", e.toString());
        }
        return Collections.emptyList();
    }

    private RecipeResponseDto fromNode(JsonNode n) {
        if (n == null || !n.isObject()) return null;

        String title = n.path("title").asText(null);
        if (title == null) return null;

        return RecipeResponseDto.builder()
                .title(title)
                .category(n.path("category").asText(null))
                .timeMin(n.hasNonNull("timeMin") ? n.get("timeMin").asInt() : null)
                .servings(n.hasNonNull("servings") ? n.get("servings").asInt() : null)
                .difficulty(n.path("difficulty").asText(null))
                .ingredients(parseIngredients(n.path("ingredients")))
                .steps(parseSteps(n.path("steps")))
                .chefNote(n.path("chefNote").asText(null))
                .tip(n.path("tip").asText(null))
                .build();
    }

    private List<RecipeResponseDto.Ingredient> parseIngredients(JsonNode arr) {
        if (arr == null || !arr.isArray()) return Collections.emptyList();
        List<RecipeResponseDto.Ingredient> out = new ArrayList<>();
        for (JsonNode x : arr) {
            if (!x.isObject()) continue;
            String name = x.path("name").asText(null);
            if (name == null || name.isBlank()) continue;
            Integer qty = x.hasNonNull("qty") ? x.get("qty").asInt() : null;
            String unit = x.path("unit").asText(null);
            out.add(RecipeResponseDto.Ingredient.builder().name(name).qty(qty).unit(unit).build());
        }
        return out;
    }

    private List<RecipeResponseDto.Step> parseSteps(JsonNode arr) {
        if (arr == null || !arr.isArray()) return Collections.emptyList();
        List<RecipeResponseDto.Step> out = new ArrayList<>();
        int i = 1;
        for (JsonNode x : arr) {
            String txt = x.isObject() ? x.path("text").asText(null) : (x.isTextual() ? x.asText() : null);
            if (txt == null || txt.isBlank()) continue;
            Integer order = x.hasNonNull("order") ? x.get("order").asInt() : i++;
            out.add(RecipeResponseDto.Step.builder().order(order).text(txt).build());
        }
        return out;
    }

    public List<RecipeResponseDto> searchRecipeByName(String query) {
        if (query == null || query.isBlank()) return Collections.emptyList();

        // 1) 프롬프트 생성 (prepare와 동일하게 리스트로 감싸기)
        String prompt = promptFactory.buildRecipeSearchPrompt(query);

        // 1차 호출
        String text = geminiService.generateText(prompt, 0.7);
        log.info("Gemini 응답: {}", text);
        List<RecipeResponseDto> parsed = parseAny(text);
        if (!parsed.isEmpty()) return parsed;

        // 2차 재시도
        String text2 = geminiService.generateText(prompt, 0.3);
        parsed = parseAny(text2);
        if (!parsed.isEmpty()) return parsed;

        log.warn("레시피 검색 실패: {}", query);
        return Collections.emptyList();
    }
}
