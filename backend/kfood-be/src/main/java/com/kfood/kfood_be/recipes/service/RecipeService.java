package com.kfood.kfood_be.recipes.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.kfood.kfood_be.recipes.dto.RecipeResponseDto;
import com.kfood.kfood_be.recipes.repository.GeneratedRecipeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RecipeService {

    private final GeneratedRecipeRepository recipeRepository;

    // 테스트를 위한 하드코딩 버전
    // TODO: Gemini 연동 필요
    public List<RecipeResponseDto> generateRecipes(List<String> ingredients) {
        List<RecipeResponseDto> responseList = new ArrayList<>();

        // 하드코딩된 더미 데이터
        RecipeResponseDto responseDto = RecipeResponseDto.builder()
                .id(1L)
                .title("김치찌개")
                .timeMin(20)
                .ingredients(List.of(
                    RecipeResponseDto.IngredientItem.builder()
                        .name("김치")
                        .qty(300)
                        .unit("g")
                        .build(),
                    RecipeResponseDto.IngredientItem.builder()
                        .name("마늘")
                        .qty(3)
                        .unit("개")
                        .build()
                ))
                .steps(List.of(
                    RecipeResponseDto.StepItem.builder()
                        .order(1)
                        .text("김치를 먹기 좋게 자릅니다.")
                        .build(),
                    RecipeResponseDto.StepItem.builder()
                        .order(2)
                        .text("냄비에 물을 넣고 끓입니다.")
                        .build()
                ))
                .build();

        responseList.add(responseDto);
        return responseList;
    }
}
