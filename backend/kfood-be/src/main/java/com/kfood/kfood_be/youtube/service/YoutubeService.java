package com.kfood.kfood_be.youtube.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kfood.kfood_be.youtube.dto.YoutubeVideoResponseDto;

@Service
public class YoutubeService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String apiUrl = "https://www.googleapis.com/youtube/v3/search";

    public YoutubeService(WebClient.Builder webClientBuilder,
                          ObjectMapper objectMapper,
                          @Value("${youtube.api-key}") String apiKey) {
        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
    }

    public List<YoutubeVideoResponseDto> searchVideos(String query) {
        String searchQuery = query;
        
        String uri = UriComponentsBuilder.fromUriString(apiUrl)
                .queryParam("part", "snippet")
                .queryParam("q", searchQuery)
                .queryParam("type", "video")
                .queryParam("maxResults", 5)
                .queryParam("key", apiKey)
                .queryParam("regionCode", "KR")
                .queryParam("order", "relevance")
                .toUriString();

        System.out.println("===== YouTube API 호출 URL =====");
        System.out.println(uri.replaceAll("key=[^&]+", "key=***"));
        System.out.println("검색어: " + searchQuery);

        try {
            String response = webClient.get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            System.out.println("===== YouTube API 응답 =====");
            System.out.println(response);

            JsonNode items = objectMapper.readTree(response).get("items");
            List<YoutubeVideoResponseDto> videos = new ArrayList<>();
            
            for (JsonNode item : items) {
                String videoId = item.get("id").get("videoId").asText();
                String title = item.get("snippet").get("title").asText();
                String description = item.get("snippet").get("description").asText();
                
                System.out.println("===== 영상 체크 =====");
                System.out.println("제목: " + title);
                System.out.println("설명: " + description);
                
                String thumbnailUrl = item.get("snippet").get("thumbnails")
                        .get("medium").get("url").asText();
                String videoUrl = "https://www.youtube.com/watch?v=" + videoId;
                
                videos.add(new YoutubeVideoResponseDto(title, videoUrl, thumbnailUrl));
            }

            System.out.println("===== 최종 결과 =====");
            System.out.println("반환된 영상 수: " + videos.size());

            return videos;
        } catch (Exception e) {
            System.err.println("===== 에러 발생 =====");
            e.printStackTrace();
            return List.of();
        }
    }
}