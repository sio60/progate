package com.kfood.kfood_be.recipes.service;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class PromptFactory {

    /**
     * 한식 수석 셰프 스타일 프롬프트 빌더
     * - 사용자 재료로만 레시피 생성
     * - 1개 레시피만 JSON으로 반환
     * - 설명 문장 / 코드블록 / 여담 금지
     */
    public String buildRecipePrompt(List<String> ings, Integer timeMax, Integer servings) {
        var head = """
                🧑‍🍳 역할: 당신은 30년 경력의 한식 수석 셰프입니다.
                👨‍🍳 상황: 제자에게 직접 레시피를 구두로 알려주듯,
                정성스럽고 정확하게 한 가지 완성 요리만 제안하세요.

                🎯 목표:
                - 아래 재료만 사용해 현실적으로 가능한 한국 요리를 하나 만듭니다.
                - %d분 이내, %d인분 기준으로 작성합니다.
                - 없는 재료를 임의로 추가하지 않습니다.
                - 출력은 반드시 JSON 형식만 사용합니다. (코드블록/설명/해설 금지)
                - 단계별 조리 순서에 ‘감각적 표현’을 적절히 포함해 주세요 (예: 노릇하게, 고소하게, 부드럽게 등).

                📋 JSON 스키마:
                {
                  "title": "요리 이름",
                  "timeMin": number,
                  "servings": number,
                  "ingredients": [
                    {"name": "재료명", "qty": number|null, "unit": "g|ml|개|큰술|작은술|null"}
                  ],
                  "steps": [
                    {"order": number, "text": "조리 단계 설명"}
                  ],
                  "tip": "셰프의 한 줄 조언"
                }

                🧂 사용 가능한 재료 목록:
                """.formatted(timeMax == null ? 30 : timeMax, servings == null ? 2 : servings);

        String list = ings.stream()
                .map(i -> "- " + i)
                .collect(Collectors.joining("\n"));

        return head + list;
    }

    /**
     * 사용자 맥락 기반 메뉴 추천 프롬프트
     * - 감정 / 날씨 / 상황에 맞춰 한식 메뉴 한 문장 추천
     */
    public String buildMenuPrompt(String context) {
        return """
                🧑‍🍳 역할: 당신은 미쉐린 한식 레스토랑의 수석 셰프입니다.
                👂 사용자 상황: %s
                👇 지침:
                - 사용자의 상황에 가장 어울리는 한국식 메뉴 1가지를 추천합니다.
                - 이유나 설명 없이 메뉴 이름만 한 문장으로 출력합니다.
                - JSON, 코드블록, 따옴표, 이모지 없이 오직 한 문장만 출력하세요.
                """.formatted(context == null ? "일반적인 식사 상황" : context);
    }
}
