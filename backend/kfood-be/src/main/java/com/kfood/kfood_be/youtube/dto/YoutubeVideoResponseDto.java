package com.kfood.kfood_be.youtube.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class YoutubeVideoResponseDto {
    private String title;
    private String videoUrl;
    private String thumbnailUrl;
}