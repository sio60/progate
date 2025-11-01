package com.kfood.kfood_be.recipes.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
@ToString
@Entity
@Table(name = "GENERATED_RECIPE")
public class GeneratedRecipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID")
    private Long id;

    @Column(name = "TITLE", length = 200)
    private String title;

    @Column(name = "TIME_MIN")
    private Integer timeMin;

    @Lob
    @Column(name = "RECIPE_JSON", columnDefinition = "CLOB")
    private String recipeJson;

    @Column(name = "AUDIO_URL", length = 300)
    private String audioUrl;

    @Column(name = "SOURCE", length = 40)
    @Builder.Default
    private String source = "gemini";

    @Column(name = "CREATED_AT")
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
