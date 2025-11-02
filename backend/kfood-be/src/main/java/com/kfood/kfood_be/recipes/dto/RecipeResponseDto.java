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
        private String name;     // 재료명(숫자/단위 없음)
        private Double qty;      // 수량(소수 OK)
        private String unit;     // g|ml|개|컵|큰술|작은술|꼬집
        private String label;    // "간장 1.5 큰술" 같은 표시용
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Step {
        private Integer order;
        private String text;
    }
}
