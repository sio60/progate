package com.kfood.kfood_be.recipes.dto;

import lombok.*;

import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class RecipeResponseDto {
    private String title;
    private String category;
    private Integer timeMin;
    private Integer servings;
    private String difficulty;
    private List<Ingredient> ingredients;
    private List<Step> steps;
    private String chefNote;
    private String tip;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Ingredient {
        private String name;
        private Integer qty;
        private String unit;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Step {
        private Integer order;
        private String text;
    }
}
