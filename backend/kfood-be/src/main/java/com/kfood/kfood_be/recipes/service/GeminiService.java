package com.kfood.kfood_be.recipes.service;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class GeminiService {

    @Value("${gemini.api-key}")
    private String apiKey;

    @Value("${gemini.model:gemini-1.5-pro-latest}")
    private String model;

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
                        "maxOutputTokens", 2048,
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
            return stripCodeFences(cleaned);
        } catch (Exception e) {
            log.error("Gemini 호출 실패(generateText)", e);
            return null;
        }
    }

    public String generateMeasuredRecipe(String prompt) {
        final String path = "/models/" + model + ":generateContent?key=" + apiKey;

        Map<String, Object> schema = buildRecipeSchema();

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", prompt))
                )),
                "generationConfig", Map.of(
                        "temperature", 0.2,
                        "topP", 0.8,
                        "topK", 1,
                        "maxOutputTokens", 2048,
                        "response_mime_type", "application/json",
                        "response_schema", schema
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
            return stripCodeFences(json);
        } catch (Exception e) {
            log.error("Gemini 호출 실패(generateMeasuredRecipe)", e);
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
        return s.replaceAll("^```json\\s*", "")
                .replaceAll("```\\s*$", "")
                .trim();
    }

    private Map<String, Object> buildRecipeSchema() {
        List<String> unitEnum = List.of("g", "ml", "개", "컵", "큰술", "작은술", "꼬집");

        Map<String, Object> ingredient = Map.of(
                "type", "OBJECT",
                "properties", Map.of(
                        "name",  Map.of("type", "STRING"),
                        "qty",   Map.of("type", "NUMBER"),
                        "unit",  Map.of("type", "STRING", "enum", unitEnum),
                        "label", Map.of("type", "STRING")
                ),
                "required", List.of("name", "qty", "unit", "label")
        );

        Map<String, Object> step = Map.of(
                "type", "OBJECT",
                "properties", Map.of(
                        "order", Map.of("type", "NUMBER"),
                        "text",  Map.of("type", "STRING")
                ),
                "required", List.of("order", "text")
        );

        return Map.of(
                "type", "OBJECT",
                "properties", Map.of(
                        "title",     Map.of("type", "STRING"),
                        "category",  Map.of("type", "STRING",
                                "enum", List.of("탕","볶음","구이","조림","국","전","밥","면","기타")),
                        "timeMin",   Map.of("type", "NUMBER"),
                        "servings",  Map.of("type", "NUMBER"),
                        "difficulty",Map.of("type", "STRING",
                                "enum", List.of("초급","중급","고급")),
                        "ingredients", Map.of("type", "ARRAY", "items", ingredient),
                        "steps",     Map.of("type", "ARRAY", "items", step),
                        "chefNote",  Map.of("type", "STRING"),
                        "tip",       Map.of("type", "STRING")
                ),
                "required", List.of("title","category","timeMin","servings","difficulty","ingredients","steps")
        );
    }
}