package com.kfood.kfood_be.recipes.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.kfood.kfood_be.recipes.dto.RecipeRequestDto;
import com.kfood.kfood_be.recipes.dto.RecipeResponseDto;
import com.kfood.kfood_be.recipes.service.RecipeService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/recipes")
@RequiredArgsConstructor
public class RecipesController {

    private final RecipeService recipeService;

    @PostMapping("/prepare")
    public ResponseEntity<List<RecipeResponseDto>> prepareRecipes(
            @Valid @RequestBody RecipeRequestDto requestDto) {

        // 기존 시그니처 유지 + 선택 파라미터 전달 가능
        List<RecipeResponseDto> recipes =
                recipeService.generateRecipes(
                        requestDto.getIngredients(),
                        requestDto.getTimeMax(),
                        requestDto.getServings()
                );

        return ResponseEntity.ok(recipes);
    }
    
    @GetMapping("/search")
    public ResponseEntity<List<RecipeResponseDto>> searchRecipes(@RequestParam String query) {
        List<RecipeResponseDto> recipes = recipeService.searchRecipeByName(query);
        return ResponseEntity.ok(recipes);
    }
}
