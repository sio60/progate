package com.kfood.kfood_be.recipes.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import java.util.List;

@Getter
@NoArgsConstructor
public class RecipeRequestDto {
    private List<String> ingredients;
    private Integer timeMax;   // 선택
    private Integer servings;  // 선택
}