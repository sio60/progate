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
import reactor.netty.http.client.HttpClient; // ✅ Reactor Netty

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
                        "maxOutputTokens", 4096,                       // ↑ 여유 토큰
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
            String cleaned = extractAllText(response);                 // ← 모든 parts 합치기
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
                        "maxOutputTokens", 4096,                       // ↑ 여유 토큰
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
            String json = extractAllText(response);                    // ← 모든 parts 합치기
            return stripCodeFences(json);
        } catch (Exception e) {
            log.error("Gemini 호출 실패(generateMeasuredRecipe)", e);
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private String extractAllText(Map<String, Object> response) {
        var cands = (List<Map<String, Object>>) response.get("candidates");
        if (cands == null || cands.isEmpty()) throw new IllegalStateException("candidates 없음");
        var content = (Map<String, Object>) cands.get(0).get("content");
        var parts = (List<Map<String, Object>>) content.get("parts");
        if (parts == null || parts.isEmpty()) throw new IllegalStateException("parts 없음");

        StringBuilder sb = new StringBuilder();
        for (Map<String, Object> p : parts) {
            Object t = p.get("text");
            if (t != null) sb.append(String.valueOf(t));
        }
        String out = sb.toString();
        if (out.isBlank()) throw new IllegalStateException("parts.text 비어있음");
        return out;
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
