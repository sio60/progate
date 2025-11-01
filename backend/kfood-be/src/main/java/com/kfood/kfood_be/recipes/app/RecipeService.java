package com.kfood.kfood_be.recipes.app;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.kfood.kfood_be.recipes.domain.repo.GeneratedRecipeRepository;
import com.kfood.kfood_be.recipes.dto.RecipeResponseDto;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RecipeService {

    private final GeneratedRecipeRepository recipeRepository;

    // /**
    //  * 프론트에서 받은 재료 리스트로 레시피 생성
    //  */
    // @Transactional
    // public List<RecipeResponseDto> generateRecipes(List<String> ingredients) {

    //     List<RecipeResponseDto> responseList = new ArrayList<>();

    //     // 1. Gemini AI 호출 (더미 데이터)
    //     // 실제 호출 시 API 연동 코드로 교체
    //     String combinedIngredients = String.join(", ", ingredients);
    //     String foodName = "김치찌개"; // AI가 추천한 음식명
    //     String recipeSteps = "1. 김치를 썬다.\n2. 물을 끓인다.\n3. 재료를 넣고 끓인다."; // AI가 반환한 레시피

    //     // 2. DB에 저장
    //     GeneratedRecipe saved = recipeRepository.save(
    //             GeneratedRecipe.builder()
    //                     .food(foodName)
    //                     .ingredient(combinedIngredients)
    //                     .recipe(recipeSteps)
    //                     .build()
    //     );

    //     // 3. ResponseDto 생성
    //     RecipeResponseDto responseDto = RecipeResponseDto.builder()
    //             .id(saved.getId())
    //             .food(saved.getFood())
    //             .ingredient(saved.getIngredient())
    //             .recipe(saved.getRecipe())
    //             .build();

    //     responseList.add(responseDto);

    //     return responseList;
    // }


        // 테스트를 위한 하드코딩 버전
        // TODO 수정필요
        public List<RecipeResponseDto> generateRecipes(List<String> ingredients) {
        List<RecipeResponseDto> responseList = new ArrayList<>();

        // 하드코딩된 더미 데이터
        String combinedIngredients = String.join(", ", ingredients);
        RecipeResponseDto responseDto = RecipeResponseDto.builder()
                .id(1L)
                .food("김치찌개")
                .ingredient(combinedIngredients)
                .recipe("1. 김치를 썬다.\n2. 물을 끓인다.\n3. 재료를 넣고 끓인다.")
                .build();

        responseList.add(responseDto);
        return responseList;
    }
}
