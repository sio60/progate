package com.kfood.kfood_be.youtube.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;

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

    private static final String SEARCH_API = "https://www.googleapis.com/youtube/v3/search";
    private static final String VIDEOS_API = "https://www.googleapis.com/youtube/v3/videos";

    // 게임류 음수 키워드(다국어)
    private static final String NEGATIVE_GAMING = "-game -게임 -gaming -実況 -プレイ -게임방송 -게임플레이 -live -스트리밍";

    public YoutubeService(WebClient.Builder webClientBuilder,
                          ObjectMapper objectMapper,
                          @Value("${youtube.api-key}") String apiKey) {
        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
    }

    /** 하위호환: lang 미지정 시 ko */
    public List<YoutubeVideoResponseDto> searchVideos(String query) {
        return searchVideos(query, "ko");
    }

    /** 먹방 자동 접미 + 게임류 차단(음수키워드 + Gaming 카테고리 필터) + 언어 가중치 */
    public List<YoutubeVideoResponseDto> searchVideos(String query, String lang) {
        try {
            final String finalQuery = buildQueryWithMukbangAndNegative(query, lang);

            // 1) search.list 호출 (snippet)
            String searchUri = UriComponentsBuilder.fromUriString(SEARCH_API)
                    .queryParam("part", "snippet")
                    .queryParam("q", finalQuery)
                    .queryParam("type", "video")
                    .queryParam("maxResults", 10)
                    .queryParam("relevanceLanguage", (lang == null || lang.isBlank()) ? "ko" : lang)
                    .queryParam("regionCode", "KR")
                    .queryParam("order", "relevance")
                    .queryParam("key", apiKey)
                    .toUriString();

            String searchResponse = webClient.get()
                    .uri(searchUri)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode root = objectMapper.readTree(searchResponse);
            JsonNode items = root.path("items");

            List<YoutubeVideoResponseDto> list = new ArrayList<>();
            List<String> ids = new ArrayList<>();

            if (items.isArray()) {
                for (JsonNode item : items) {
                    String vid = item.path("id").path("videoId").asText("");
                    if (vid.isEmpty()) continue;
                    ids.add(vid);

                    JsonNode sn = item.path("snippet");
                    String title = sn.path("title").asText("");
                    String channelTitle = sn.path("channelTitle").asText("");
                    String thumbnail = sn.path("thumbnails").path("medium").path("url").asText("");
                    String publishedAt = sn.path("publishedAt").asText("");

                    list.add(YoutubeVideoResponseDto.of(
                            vid,
                            title,
                            channelTitle,
                            thumbnail,
                            publishedAt,
                            "0" // 조회수는 아래 videos.list에서 병합
                    ));
                }
            }

            if (ids.isEmpty()) return list;

            // 2) videos.list 호출 (snippet,statistics) — 조회수 + 카테고리 동시 취득
            String videosUri = UriComponentsBuilder.fromUriString(VIDEOS_API)
                    .queryParam("part", "snippet,statistics")
                    .queryParam("id", String.join(",", ids))
                    .queryParam("key", apiKey)
                    .toUriString();

            String videosResponse = webClient.get()
                    .uri(videosUri)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode vRoot = objectMapper.readTree(videosResponse);
            JsonNode vItems = vRoot.path("items");

            Map<String, String> viewCountMap = new HashMap<>();
            Map<String, String> categoryMap  = new HashMap<>();
            if (vItems.isArray()) {
                for (JsonNode vItem : vItems) {
                    String id = vItem.path("id").asText("");
                    String vc = vItem.path("statistics").path("viewCount").asText("0");
                    String cat = vItem.path("snippet").path("categoryId").asText("");
                    if (!id.isEmpty()) {
                        viewCountMap.put(id, vc);
                        categoryMap.put(id, cat);
                    }
                }
            }

            // 3) Gaming(20) 제거 + 제목/채널에 게임 키워드 있으면 제거 + 조회수 병합
            List<YoutubeVideoResponseDto> filtered = new ArrayList<>();
            for (YoutubeVideoResponseDto dto : list) {
                String cat = categoryMap.getOrDefault(dto.getVideoId(), "");
                if ("20".equals(cat)) continue; // YouTube Gaming 카테고리
                if (looksLikeGaming(dto.getTitle(), dto.getChannelTitle())) continue; // 추가 방어
                dto.setViewCount(viewCountMap.getOrDefault(dto.getVideoId(), "0"));
                filtered.add(dto);
            }

            return filtered;

        } catch (Exception e) {
            System.err.println("===== YouTube Service Error =====");
            e.printStackTrace();
            return List.of();
        }
    }

    // ===== 내부 유틸 =====

    private static final Map<String, String> MUKBANG_SUFFIX_BY_LANG = Map.of(
            "ko", "먹방",
            "en", "mukbang",
            "ja", "モッパン"
    );

    /** 최종 쿼리: 먹방 접미 보장 + 게임류 음수 키워드 부착 */
    private String buildQueryWithMukbangAndNegative(String query, String lang) {
        String base = ensureMukbangTerm(query, lang);
        // 이미 사용자 입력에 음수키워드가 있다면 중복되더라도 문제는 없으니 단순 덧붙임
        return base + " " + NEGATIVE_GAMING;
    }

    /** '먹방' 키워드 없으면 언어별 접미사 붙임 */
    private String ensureMukbangTerm(String query, String lang) {
        String q = (query == null) ? "" : query.trim();
        if (q.isEmpty()) return MUKBANG_SUFFIX_BY_LANG.getOrDefault(lang, "먹방");
        if (q.matches(".*(?i)(먹방|mukbang|モッパン).*")) return q;
        String suffix = MUKBANG_SUFFIX_BY_LANG.getOrDefault(lang, "먹방");
        return q + " " + suffix;
    }

    /** 제목/채널명으로 게임 냄새 나는지 대충 컷(보조 필터) */
    private boolean looksLikeGaming(String... fields) {
        for (String s : fields) {
            if (s == null) continue;
            String t = s.toLowerCase(Locale.ROOT);
            if (t.contains("게임") || t.contains("game") || t.contains("gaming") || t.contains("実況") || t.contains("プレイ")) {
                return true;
            }
        }
        return false;
    }
}
