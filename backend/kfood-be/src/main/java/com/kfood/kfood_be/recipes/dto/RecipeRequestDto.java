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

    /** ["김치","두부","대파"] */
    @NotEmpty(message = "재료 목록은 비어있을 수 없습니다.")
    private List<String> ingredients;

    /** 선택값: 최대 조리 시간(분). null이면 서비스에서 기본 30분 */
    private Integer timeMax;

    /** 선택값: 인분. null이면 서비스에서 기본 2인분 */
    private Integer servings;
}
