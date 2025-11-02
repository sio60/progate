// src/main/java/com/kfood/kfood_be/youtube/controller/YoutubeController.java
package com.kfood.kfood_be.youtube.controller;

import com.kfood.kfood_be.youtube.dto.YoutubeVideoResponseDto;
import com.kfood.kfood_be.youtube.service.YoutubeService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
// ✅ 둘 다 허용: /youtube/*, /api/youtube/*
@RequestMapping({"/youtube", "/api/youtube"})
@CrossOrigin(origins = "*") // 개발용(배포 시 제한 권장)
public class YoutubeController {

    private final YoutubeService youtubeService;

    public YoutubeController(YoutubeService youtubeService) {
        this.youtubeService = youtubeService;
    }

    // ✅ q, query 둘 다 받기 (프론트 혼용 대비)
    @GetMapping("/search")
    public List<YoutubeVideoResponseDto> searchYoutube(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "query", required = false) String query
    ) {
        String raw = (q != null && !q.trim().isEmpty()) ? q : (query != null ? query : "");
        if (raw == null || raw.trim().isEmpty()) return List.of();
        return youtubeService.searchVideos(raw.trim());
    }
}
