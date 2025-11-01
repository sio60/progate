package com.kfood.kfood_be.youtube.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class YoutubeVideoResponseDto {
    private String title;
    private String videoUrl;
    private String thumbnailUrl;
}