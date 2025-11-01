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

    @Value("${gemini.api-key}") private String apiKey;
    @Value("${gemini.model}")   private String model;
    @Value("${gemini.endpoint:https://generativelanguage.googleapis.com/v1}")
    private String endpoint;

    private WebClient web;

    @PostConstruct
    void init() {
        HttpClient http = HttpClient.create()
                .responseTimeout(Duration.ofSeconds(60))
                .compress(true);

        this.web = WebClient.builder()
                .baseUrl(endpoint)                    
                .defaultHeader("x-goog-api-key", apiKey) 
                .clientConnector(new ReactorClientHttpConnector(http))
                .build();

        log.info("[Gemini] bean ready. endpoint={}, model={}", endpoint, model);
    }

    public String generateText(String prompt) {
        String path = "/models/{model}:generateContent";
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
        );

        try {
            Map<?,?> response = web.post()
                    .uri(path, model)                       
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(60))
                    .block();
            
            // Gemini 응답 구조: candidates[0].content.parts[0].text
            var candidates = (List<Map<?,?>>) response.get("candidates");
            if (candidates == null || candidates.isEmpty()) {
                throw new RuntimeException("Gemini 응답에 candidates가 없음");
            }
            var content = (Map<?,?>) candidates.get(0).get("content");
            var parts = (List<Map<?,?>>) content.get("parts");
            return (String) parts.get(0).get("text");
        } catch (Exception e) {
            log.error("Gemini 호출 실패", e);
            throw new RuntimeException("Gemini 응답 파싱 실패: " + e.getMessage(), e);
        }
    }
}
