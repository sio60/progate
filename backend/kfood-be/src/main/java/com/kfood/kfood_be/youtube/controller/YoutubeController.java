package com.kfood.kfood_be.youtube.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.kfood.kfood_be.youtube.dto.YoutubeVideoResponseDto;
import com.kfood.kfood_be.youtube.service.YoutubeService;

@RestController
public class YoutubeController {

    private final YoutubeService youtubeService;

    public YoutubeController(YoutubeService youtubeService) {
        this.youtubeService = youtubeService;
    }

    // http://localhost:8080/youtube/search?query=<검색어>
    @GetMapping("/youtube/search")
    public List<YoutubeVideoResponseDto> searchYoutube(@RequestParam String query) {
        return youtubeService.searchVideos(query);
    }
}
