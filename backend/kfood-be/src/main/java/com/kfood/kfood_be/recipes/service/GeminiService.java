package com.kfood.kfood_be.recipes.service;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import reactor.netty.http.client.HttpClient;

@Slf4j
@Service
public class GeminiService {

    @Value("${gemini.api-key}")
    private String apiKey;

    // 필요 시 yml에서 바꾸면 됩니다. (예: gemini-2.5-pro)
    @Value("${gemini.model:gemini-1.5-pro-latest}")
    private String model;

    // v1beta 권장 (structured output 동작)
    @Value("${gemini.endpoint:https://generativelanguage.googleapis.com/v1beta}")
    private String endpoint;

    private WebClient web;

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

    /** 기존 호환용 (프롬프트만, JSON 선호) */
    public String generateText(String prompt) {
        return generateText(prompt, 0.7);
    }

    /** 기존 호환용 (프롬프트만, JSON 선호) */
    public String generateText(String prompt, double temperature) {
        final String path = "/models/" + model + ":generateContent?key=" + apiKey;

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", prompt))
                )),
                "generationConfig", Map.of(
                        "temperature", temperature,
                        "topP", 0.95,
                        "topK", 40,
                        "maxOutputTokens", 4096,
                        // ❗️ API가 인식하는 정확한 키: snake_case
                        "response_mime_type", "application/json"
                )
        );

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

            String cleaned = extractFirstText(response);
            cleaned = stripCodeFences(cleaned);

            log.info("[Gemini 응답(JSON 선호)] {}", preview(cleaned));
            return cleaned;
        } catch (Exception e) {
            log.error("Gemini 호출 실패(generateText)", e);
            return null;
        }
    }

    /**
     * 🔥 계량 강제용: 스키마 + 저온 + JSON MIME 고정
     * - qty/unit 필수, 허용 단위 enum 강제
     * - steps는 text로 두되, 프롬프트에서 “숫자+단위 필수” 요구 (이미 PromptFactory에서 강제 중)
     */
    public String generateMeasuredRecipe(String prompt) {
        final String path = "/models/" + model + ":generateContent?key=" + apiKey;

        Map<String, Object> schema = buildRecipeSchema(); // 아래 메서드 참조

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", prompt))
                )),
                "generationConfig", Map.of(
                        "temperature", 0.2,       // 저온으로 일관성 ↑
                        "topP", 0.8,
                        "topK", 1,
                        "maxOutputTokens", 4096,
                        "response_mime_type", "application/json",
                        "response_schema", schema // ✅ 스키마 강제
                )
        );

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

            String json = extractFirstText(response);
            json = stripCodeFences(json);

            log.info("[Gemini 응답(스키마 강제)] {}", preview(json));
            return json;
        } catch (Exception e) {
            log.error("Gemini 호출 실패(generateMeasuredRecipe)", e);
            return null;
        }
    }

    // ---------- 내부 유틸 ---------- //

    /** candidates[0].content.parts[0].text 추출 (방어적으로 파싱) */
    @SuppressWarnings("unchecked")
    private String extractFirstText(Map<String, Object> response) {
        try {
            List<Map<String, Object>> cands = (List<Map<String, Object>>) response.get("candidates");
            if (cands == null || cands.isEmpty()) throw new IllegalStateException("candidates 없음");
            Map<String, Object> content = (Map<String, Object>) cands.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            Object text = parts.get(0).get("text");
            if (text == null) throw new IllegalStateException("parts[0].text 없음");
            return String.valueOf(text);
        } catch (Exception e) {
            log.error("텍스트 추출 실패: {}", response, e);
            throw e;
        }
    }

    /** ```json / ``` 코드펜스 제거 & 트림 */
    private String stripCodeFences(String s) {
        if (s == null) return null;
        return s
                .replaceAll("^```json\\s*", "")
                .replaceAll("```\\s*$", "")
                .trim();
    }

    private String preview(String s) {
        if (s == null) return "null";
        return s.length() > 400 ? s.substring(0, 400) + "..." : s;
    }

    /**
     * 응답 스키마: ingredients[].qty/unit 필수 & unit enum 강제
     * - steps[].text는 프롬프트에서 “숫자+단위 필수”를 강제 (스키마로 정규식 강제는 아직 불가)
     */
    private Map<String, Object> buildRecipeSchema() {
        // 허용 단위
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
                        "servings", Map.of("type", "NUMBER"),
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
}