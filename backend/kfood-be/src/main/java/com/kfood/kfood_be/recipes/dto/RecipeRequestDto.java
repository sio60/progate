package com.kfood.kfood_be.recipes.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
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
public class RecipeRequestDto {

    @NotEmpty(message = "재료 목록은 비어있을 수 없습니다.")
    private List<String> ingredients; // ["김치", "마늘", "대파"] 형태
}
