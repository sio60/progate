package com.kfood.kfood_be;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(
    scanBasePackages = {
        "com.kfood.kfood_be",        // 기존
        "com.example.health_care"    // 같이 쓰는 패키지가 있으면 추가
    }
)
public class KfoodBeApplication {
    public static void main(String[] args) {
        SpringApplication.run(KfoodBeApplication.class, args);
    }
}
