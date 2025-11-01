package com.kfood.kfood_be.recipes.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

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

    public String generateText(String prompt) { return generateText(prompt, 0.7); }

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
                        "responseMimeType", "application/json"
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

            @SuppressWarnings("unchecked")
            List<Map<String,Object>> cands = (List<Map<String,Object>>) response.get("candidates");
            if (cands == null || cands.isEmpty()) throw new IllegalStateException("candidates 없음");

            @SuppressWarnings("unchecked")
            Map<String,Object> content = (Map<String,Object>) cands.get(0).get("content");
            @SuppressWarnings("unchecked")
            List<Map<String,Object>> parts = (List<Map<String,Object>>) content.get("parts");

            String text = String.valueOf(parts.get(0).get("text"));
            String cleaned = text == null ? "" : text
                    .replaceAll("```json\\s*", "")
                    .replaceAll("```\\s*", "")
                    .trim();

            log.info("[Gemini 응답] {}", cleaned.length() > 400 ? cleaned.substring(0,400) + "..." : cleaned);
            return cleaned;
        } catch (Exception e) {
            log.error("Gemini 호출 실패", e);
            return null;
        }
    }
}
