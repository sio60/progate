package com.kfood.kfood_be.recipes.service;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class PromptFactory {

    public String buildRecipePrompt(List<String> ings, Integer timeMax, Integer servings) {
        var head = """
                역할: 당신은 한식 셰프입니다.
                주어진 재료만 사용하여 한국어 레시피 1개를 생성하세요.
                제약: %d분 이내, %d인분, JSON만 출력(설명/코드블록 금지), 없는 재료 임의 추가 금지.
                스키마:
                {
                  "title": "...",
                  "timeMin": 0,
                  "ingredients":[{"name":"...", "qty": number|null, "unit":"g|ml|개|대|큰술|작은술|null"}],
                  "steps":[{"order":1, "text":"..."}, ...]
                }
                재료:
                """.formatted(timeMax == null ? 30 : timeMax, servings == null ? 2 : servings);

        String list = ings.stream()
                .map(i -> "- " + i)
                .collect(Collectors.joining("\n"));

        return head + list;
    }

    public String buildMenuPrompt(String context) {
        return """
                사용자 맥락: %s
                위 상황에 맞춘 한국식 메뉴 1가지를 한 문장으로 추천해 주세요.
                JSON 없이 순수 텍스트 한 문장만 출력.
                """.formatted(context == null ? "일반" : context);
    }
}
