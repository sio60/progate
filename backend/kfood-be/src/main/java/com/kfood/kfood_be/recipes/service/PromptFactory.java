package com.kfood.kfood_be.recipes.service;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.StringJoiner;
import java.util.stream.Collectors;

/**
 * Gemini에 "생각은 네가 하고, 결과는 JSON만" 강제하는 프롬프트.
 * - 한국 가정식 톤 유지
 * - 카테고리 자동 선정(무침 고정/편향 방지)
 * - 출력은 오직 JSON (코드펜스/설명 금지)
 */
@Component
public class PromptFactory {

    public String buildRecipePrompt(List<String> ings, Integer timeMax, Integer servings) {
        int T = timeMax == null ? 30 : timeMax;
        int S = servings == null ? 2 : servings;

        String ingredientsList = (ings == null || ings.isEmpty())
                ? "- (재료 없음)"
                : ings.stream().map(i -> "- " + i).collect(Collectors.joining("\n"));

        StringJoiner sj = new StringJoiner("\n\n");

        sj.add("""
                [역할]
                당신은 한국 가정식 전문 셰프입니다. 불·타이밍·식감·향을 섬세하게 다루며, 과장 없이 단정한 한국어로 말합니다.
                """);

        sj.add("""
                [목표]
                사용자가 가진 재료만으로 실제 가능한 ‘한국 요리 1가지’를 설계하세요.
                요리 ‘카테고리’를 스스로 결정하고(국/찌개/볶음/조림/밥/면/전/기타), 4~8단계의 조리 과정을 만듭니다.
                """);

        sj.add("""
                [재료]
                아래 목록만 사용할 수 있습니다. (예외: 소금·물·식용유)
                """ + ingredientsList);

        sj.add("""
                [제약]
                - 총 조리 시간: %d 분 이내, 인분: %d.
                - 출력은 오직 JSON 한 개. 설명/코드블록/이모지/영어/주석 금지.
                - steps에는 반드시 불·타이밍·감각(예: 세게 달군다/숨이 죽기 전/불을 낮춘다/윤기/고소하게 등)을 포함.
                - '무침'은 채소+양념 위주로 충분할 때만 선택. 김치+밥이면 볶음밥, 된장+(물|육수|두부)이면 된장찌개/국,
                  면 키워드(면/국수/소면/우동)는 면 요리, 육류+간장/고추장은 볶음/조림을 우선 고려하세요.
                - 재료가 부족하면 조리법을 단순화합니다. 임의 재료 추가 금지(소금·물·식용유 제외).
                """.formatted(T, S));

        sj.add("""
                [출력 JSON 스키마]
                {
                  "title": "요리 이름",
                  "category": "탕|볶음|구이|조림|국|전|밥|면|기타",
                  "timeMin": number,
                  "servings": number,
                  "difficulty": "초급|중급|고급",
                  "ingredients": [
                    {"name": "재료명", "qty": number|null, "unit": "g|ml|개|큰술|작은술|null"}
                  ],
                  "steps": [
                    {"order": number, "text": "조리 과정 (불/타이밍/감각 표현 포함, 한국어)"}
                  ],
                  "chefNote": "짧은 한마디 조언",
                  "tip": "초보자 실패 방지 팁"
                }
                """);

        sj.add("""
                [중요]
                - 네가 내부적으로 어떤 판단을 하든 ‘생각 과정’은 출력하지 말고 최종 JSON만 출력.
                - 코드블록(```), 마크다운, 추가 텍스트 절대 금지.
                """);

        return sj.toString();
    }
}
