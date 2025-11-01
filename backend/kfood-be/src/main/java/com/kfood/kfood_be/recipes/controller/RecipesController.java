package com.kfood.kfood_be.recipes.controller;

import com.kfood.kfood_be.recipes.dto.RecipeRequestDto;
import com.kfood.kfood_be.recipes.dto.RecipeResponseDto;
import com.kfood.kfood_be.recipes.service.RecipeService;

import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recipes")
@RequiredArgsConstructor
public class RecipesController {

    private final RecipeService recipeService;

    @PostMapping("/prepare")
    public ResponseEntity<List<RecipeResponseDto>> prepareRecipes(
            @Valid @RequestBody RecipeRequestDto requestDto) {

        List<RecipeResponseDto> recipes = recipeService.generateRecipes(requestDto.getIngredients());
        return ResponseEntity.ok(recipes);
    }
}
