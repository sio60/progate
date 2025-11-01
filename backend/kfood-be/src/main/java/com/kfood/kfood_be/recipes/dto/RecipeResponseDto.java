package com.kfood.kfood_be.recipes.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeResponseDto {

    private Long id;             // DB 저장된 레시피 ID
    private String food;         // 음식명
    private String ingredient;   // 재료명 (콤마로 구분)
    private String recipe;       // 요리방법 (String으로 저장)
}
