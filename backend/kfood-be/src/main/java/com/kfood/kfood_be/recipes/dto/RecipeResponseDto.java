package com.kfood.kfood_be.recipes.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeResponseDto {
    private Long id;
    private String food;
    private String ingredient;
    private String recipe;
}
