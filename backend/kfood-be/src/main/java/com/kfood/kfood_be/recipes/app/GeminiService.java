package com.kfood.kfood_be.recipes.app;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
public class GeminiService {
    @Value("${gemini.api-key}") String apiKey;
    @Value("${gemini.model}") String model;
    @Value("${gemini.endpoint}") String endpoint;

    private final WebClient web = WebClient.builder().build();

    public String generateText(String prompt) {
        String url = "%s/%s:generateContent?key=%s".formatted(endpoint, model, apiKey);
        Map<String,Object> req = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))))
        ;

        Map<?,?> body = web.post().uri(url).bodyValue(req)
                .retrieve().bodyToMono(Map.class).block();

        try {
            var candidates = (List<Map<?,?>>) body.get("candidates");
            var content = (Map<?,?>) candidates.get(0).get("content");
            var parts = (List<Map<?,?>>) content.get("parts");
            return (String) parts.get(0).get("text");
        } catch (Exception e) {
            throw new RuntimeException("Gemini 응답 파싱 실패", e);
        }
    }
}
