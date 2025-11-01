package com.kfood.kfood_be.recipes.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeResponseDto {

    private Long id;
    private String title;
    private Integer timeMin;
    private List<IngredientItem> ingredients;
    private List<StepItem> steps;
    private String audioUrl;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class IngredientItem {
        private String name;
        private Integer qty;
        private String unit;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StepItem {
        private Integer order;
        private String text;
    }
}
