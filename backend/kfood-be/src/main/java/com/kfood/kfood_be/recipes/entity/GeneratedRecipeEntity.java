package com.kfood.kfood_be.recipes.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "GENERATED_RECIPE")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeneratedRecipeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "recipe_seq")
    @SequenceGenerator(name = "recipe_seq", sequenceName = "RECIPE_SEQ", allocationSize = 1)
    private Long id;

    @Column(name = "TITLE", nullable = false, length = 200)
    private String title;

    @Column(name = "TIME_MIN", nullable = false)
    private Integer timeMin;

    @Column(name = "RECIPE_JSON", nullable = false, length = 4000)
    private String recipeJson;

    @Column(name = "AUDIO_URL", length = 300)
    private String audioUrl;

    @Column(name = "SOURCE", length = 40)
    private String source = "gemini";

    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;
}
