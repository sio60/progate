package com.kfood.kfood_be.recipes.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kfood.kfood_be.recipes.dto.RecipeResponseDto;
import com.kfood.kfood_be.recipes.entity.GeneratedRecipeEntity;
import com.kfood.kfood_be.recipes.repository.GeneratedRecipeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecipeService {

    private final GeneratedRecipeRepository repo;
    private final GeminiService gemini; // 프롬프트 생성은 기존 PromptFactory 사용 중이면 연결

    private final ObjectMapper om = new ObjectMapper();

    /**
     * 1) 재료들을 문자열로 합침
     * 2) DB에 같은(또는 포함) 재료 결과가 있으면 그걸 반환
     * 3) 없으면 Gemini 호출 → 파싱 → 저장 → 반환
     */
    @Transactional
    public List<RecipeResponseDto> generateRecipes(List<String> ingredients) {
        String joined = joinIngredients(ingredients);

        // 1) 캐시처럼 DB에서 먼저 조회 (부분일치)
        List<GeneratedRecipeEntity> cached = repo.findByIngredientContainingIgnoreCase(joined);
        if (!cached.isEmpty()) {
            return cached.stream().map(this::toDto).collect(Collectors.toList());
        }

        // 2) 없으면 Gemini 호출
        String prompt = buildPrompt(joined);
        String geminiRaw = gemini.generateText(prompt);

        // 기대 포맷: [{"food":"김치전","ingredient":"김치,밀가루,대파","recipe":"..."} , ...]
        List<Map<String, String>> parsed = safeParseJsonList(geminiRaw);

        if (parsed.isEmpty()) {
            // 제너레이티브 응답이 JSON이 아니거나 빈 경우 방어적으로 1개 생성
            GeneratedRecipeEntity fallback = repo.save(GeneratedRecipeEntity.builder()
                    .food("추천요리")
                    .ingredient(joined)
                    .recipe(geminiRaw.length() > 3900 ? geminiRaw.substring(0, 3900) : geminiRaw)
                    .build());
            return List.of(toDto(fallback));
        }

        List<GeneratedRecipeEntity> saved = new ArrayList<>();
        for (Map<String, String> m : parsed) {
            GeneratedRecipeEntity e = GeneratedRecipeEntity.builder()
                    .food(   Optional.ofNullable(m.get("food")).orElse("추천요리"))
                    .ingredient(Optional.ofNullable(m.get("ingredient")).orElse(joined))
                    .recipe( Optional.ofNullable(m.get("recipe")).orElse(""))
                    .build();
            saved.add(repo.save(e));
        }
        return saved.stream().map(this::toDto).collect(Collectors.toList());
    }

    // 선택: ingredient 포함 검색용
    @Transactional(readOnly = true)
    public List<RecipeResponseDto> findByIngredient(String ingredient) {
        return repo.findByIngredientContainingIgnoreCase(ingredient)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    private String joinIngredients(List<String> ingredients) {
        return ingredients.stream()
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.joining(", "));
    }

    private String buildPrompt(String joined) {
        return """
                다음 재료로 만들 수 있는 한국 전통음식 1~3개를 제시해.
                JSON 배열로만 응답해. 각 원소는 { "food": 음식명, "ingredient": "콤마로 나열", "recipe": "단계별 설명" } 형식.
                재료: %s
                """.formatted(joined);
    }

    private RecipeResponseDto toDto(GeneratedRecipeEntity e) {
        return RecipeResponseDto.builder()
                .id(e.getId())
                .food(e.getFood())
                .ingredient(e.getIngredient())
                .recipe(e.getRecipe())
                .build();
    }

    private List<Map<String, String>> safeParseJsonList(String raw) {
        try {
            String trimmed = raw.strip();
            // 코드블록(```json ... ```) 제거 방어
            if (trimmed.startsWith("```")) {
                int first = trimmed.indexOf('[');
                int last  = trimmed.lastIndexOf(']');
                if (first >= 0 && last > first) {
                    trimmed = trimmed.substring(first, last + 1);
                }
            }
            return om.readValue(trimmed, new TypeReference<List<Map<String, String>>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
