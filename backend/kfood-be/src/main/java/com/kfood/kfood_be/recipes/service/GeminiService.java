package com.kfood.kfood_be.recipes.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.*;
import java.util.regex.Pattern;

@Slf4j
@Service
public class GeminiService {

    @Value("${gemini.api-key}")
    private String apiKey;

    // 필요 시 yml에서 교체: gemini-2.5-pro 등
    @Value("${gemini.model:gemini-1.5-pro-latest}")
    private String model;

    // v1beta 권장 (structured output)
    @Value("${gemini.endpoint:https://generativelanguage.googleapis.com/v1beta}")
    private String endpoint;

    private WebClient web;
    private final ObjectMapper om = new ObjectMapper();

    private static final Set<String> ALLOWED_UNITS =
            Set.of("g","ml","개","컵","큰술","작은술","꼬집");

    private static final List<String> FORBIDDEN_WORDS =
            List.of("약간","적당량","조금","취향껏","알맞게","수북","적정량");

    private static final Pattern STEP_MEASURE_REGEX =
            Pattern.compile(".*\\d+\\s*(g|ml|개|컵|큰술|작은술|꼬집).*");

    @PostConstruct
    void init() {
        HttpClient http = HttpClient.create()
                .responseTimeout(Duration.ofSeconds(60))
                .compress(true);

        this.web = WebClient.builder()
                .baseUrl(endpoint)
                .clientConnector(new ReactorClientHttpConnector(http))
                .build();

        log.info("[Gemini] ready. endpoint={}, model={}", endpoint, model);
    }

    /** 프롬프트만(레거시). JSON 선호만 적용 */
    public String generateText(String prompt) {
        return callOnce(prompt, 0.7, false);
    }

    /** 정량 계량 강제 호출(스키마 + 저온 + 검증/재시도) */
    public String generateMeasuredRecipe(String prompt) {
        // 1차 호출
        String json = callOnce(prompt, 0.2, true);
        if (json == null || json.isBlank()) return json;

        // 검증
        if (isValidMeasured(json)) {
            log.info("[Gemini 검증] 1차 통과");
            return json;
        }

        // 실패: 금지어/누락 지적 후 1회 재시도
        String correction = buildCorrectionHint(json);
        String retryPrompt = prompt + "\n\n[보정 요청]\n" + correction + "\n위반을 모두 수정한 최종 JSON만 출력.";
        log.warn("[Gemini 검증] 1차 실패 → 재시도");

        String json2 = callOnce(retryPrompt, 0.2, true);
        if (json2 != null && isValidMeasured(json2)) {
            log.info("[Gemini 검증] 2차 통과");
            return json2;
        }
        log.warn("[Gemini 검증] 2차도 실패 → 1차 결과 반환(후처리에서 필터링 가능)");
        return json; // 필요 시 여기서 서버측 후처리/치환 로직 추가 가능
    }

    // ---------------- 내부 구현 ---------------- //

    private String callOnce(String prompt, double temperature, boolean forceSchema) {
        final String path = "/models/" + model + ":generateContent?key=" + apiKey;

        Map<String, Object> body = new HashMap<>();
        body.put("contents", List.of(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", prompt))
        )));

        Map<String, Object> gen = new HashMap<>();
        gen.put("temperature", temperature);
        gen.put("topP", 0.8);
        gen.put("topK", 1);
        gen.put("maxOutputTokens", 2048);
        gen.put("response_mime_type", "application/json");
        if (forceSchema) {
            gen.put("response_schema", buildRecipeSchema());
        }
        body.put("generationConfig", gen);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = web.post()
                    .uri(path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(60))
                    .block();

            if (response == null) throw new IllegalStateException("응답 null");

            String text = extractFirstText(response);
            String cleaned = stripCodeFences(text);

            log.info("[Gemini 응답] {}", preview(cleaned));
            return cleaned;
        } catch (Exception e) {
            log.error("Gemini 호출 실패", e);
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private String extractFirstText(Map<String, Object> response) {
        List<Map<String, Object>> cands = (List<Map<String, Object>>) response.get("candidates");
        if (cands == null || cands.isEmpty()) throw new IllegalStateException("candidates 없음");
        Map<String, Object> content = (Map<String, Object>) cands.get(0).get("content");
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        Object text = parts.get(0).get("text");
        if (text == null) throw new IllegalStateException("parts[0].text 없음");
        return String.valueOf(text);
    }

    private String stripCodeFences(String s) {
        if (s == null) return null;
        return s
                .replaceAll("^```json\\s*", "")
                .replaceAll("^```\\s*", "")
                .replaceAll("```\\s*$", "")
                .trim();
    }

    private String preview(String s) {
        if (s == null) return "null";
        return s.length() > 400 ? s.substring(0, 400) + "..." : s;
    }

    /** 응답 스키마: ingredients[].qty/unit 필수 & unit enum 강제 */
    private Map<String, Object> buildRecipeSchema() {
        List<String> unitEnum = List.of("g", "ml", "개", "컵", "큰술", "작은술", "꼬집");

        Map<String, Object> ingredient = Map.of(
                "type", "OBJECT",
                "properties", Map.of(
                        "name", Map.of("type", "STRING"),
                        "qty", Map.of("type", "NUMBER"),
                        "unit", Map.of("type", "STRING", "enum", unitEnum)
                ),
                "required", List.of("name", "qty", "unit")
        );

        Map<String, Object> step = Map.of(
                "type", "OBJECT",
                "properties", Map.of(
                        "order", Map.of("type", "NUMBER"),
                        "text", Map.of("type", "STRING")
                ),
                "required", List.of("order", "text")
        );

        return Map.of(
                "type", "OBJECT",
                "properties", Map.of(
                        "title", Map.of("type", "STRING"),
                        "category", Map.of("type", "STRING",
                                "enum", List.of("탕","볶음","구이","조림","국","전","밥","면","기타")),
                        "timeMin", Map.of("type", "NUMBER"),
                        "servings", Map.of("type", "NUMBER"), // 프롬프트에서 1 고정
                        "difficulty", Map.of("type", "STRING",
                                "enum", List.of("초급","중급","고급")),
                        "ingredients", Map.of("type", "ARRAY", "items", ingredient),
                        "steps", Map.of("type", "ARRAY", "items", step),
                        "chefNote", Map.of("type", "STRING"),
                        "tip", Map.of("type", "STRING")
                ),
                "required", List.of("title","category","timeMin","servings","difficulty","ingredients","steps")
        );
    }

    /** 서버측 검증: 모호어, 단위, 수치 누락, 단계 수치 포함 */
    private boolean isValidMeasured(String json) {
        try {
            JsonNode root = om.readTree(json);

            // ingredients 체크
            JsonNode ings = root.path("ingredients");
            if (!ings.isArray() || ings.size() == 0) return false;
            for (JsonNode ing : ings) {
                if (ing.path("name").isMissingNode()) return false;
                if (!ing.path("qty").isNumber()) return false;
                String unit = ing.path("unit").asText("");
                if (!ALLOWED_UNITS.contains(unit)) return false;
                if (containsForbidden(ing.toString())) return false;
            }

            // steps 체크: 각 문장에 수치+단위 1개 이상
            JsonNode steps = root.path("steps");
            if (!steps.isArray() || steps.size() == 0) return false;
            for (JsonNode st : steps) {
                String t = st.path("text").asText("");
                if (!STEP_MEASURE_REGEX.matcher(t).matches()) return false;
                if (containsForbidden(t)) return false;
            }

            // servings 1 고정 요구
            if (root.path("servings").asInt(-1) != 1) return false;

            // 금지어 전체 스캔
            if (containsForbidden(json)) return false;

            return true;
        } catch (Exception e) {
            log.warn("검증 중 예외: {}", e.getMessage());
            return false;
        }
    }

    private boolean containsForbidden(String text) {
        if (text == null) return false;
        for (String w : FORBIDDEN_WORDS) {
            if (text.contains(w)) return true;
        }
        return false;
    }

    /** 재시도용 보정 힌트 생성 (어디가 문제였는지 모델에 구체 지시) */
    private String buildCorrectionHint(String json) {
        StringBuilder sb = new StringBuilder();
        sb.append("- 발견된 문제를 모두 수정하세요.\n")
          .append("  · 금지어: ").append(String.join(", ", FORBIDDEN_WORDS)).append("\n")
          .append("  · 허용 단위: ").append(String.join(", ", ALLOWED_UNITS)).append("\n")
          .append("  · steps 각 문장에 숫자+단위 최소 1개 포함\n")
          .append("  · servings=1 고정\n")
          .append("아래는 이전 시도 JSON입니다. 규칙을 지켜 정량으로 보정하세요:\n")
          .append(json);
        return sb.toString();
    }
}
