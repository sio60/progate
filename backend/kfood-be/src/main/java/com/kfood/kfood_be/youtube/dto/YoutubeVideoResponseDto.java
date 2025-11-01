package com.kfood.kfood_be.youtube.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 프론트 호환 필드(videoUrl, thumbnailUrl) 유지 + 확장 필드 추가 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class YoutubeVideoResponseDto {

    /** 유튜브 비디오 ID (예: dQw4w9WgXcQ) */
    private String videoId;

    /** 영상 제목 */
    private String title;

    /** 채널명 */
    private String channelTitle;

    /** 썸네일 URL (프론트에서 item.thumbnailUrl) */
    private String thumbnailUrl;

    /** 영상 URL (프론트에서 item.videoUrl) */
    private String videoUrl;

    /** 업로드 일자(ISO-8601) */
    private String publishedAt;

    /** 조회수(문자열로 전달: 큰 수 표기/포맷 유연성) */
    private String viewCount;

    /** 편의 팩토리 */
    public static YoutubeVideoResponseDto of(
            String videoId,
            String title,
            String channelTitle,
            String thumbnailUrl,
            String publishedAt,
            String viewCount
    ) {
        String url = (videoId == null || videoId.isBlank())
                ? null
                : "https://www.youtube.com/watch?v=" + videoId;

        return YoutubeVideoResponseDto.builder()
                .videoId(videoId)
                .title(title)
                .channelTitle(channelTitle)
                .thumbnailUrl(thumbnailUrl)
                .videoUrl(url)
                .publishedAt(publishedAt)
                .viewCount(viewCount)
                .build();
    }
}
