package com.kfood.kfood_be.recipes.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "GENERATED_RECIPE")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GeneratedRecipeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID")
    private Long id;

    @Column(name = "FOOD", nullable = false, length = 255)
    private String food;

    @Column(name = "INGREDIENT", nullable = false, length = 255)
    private String ingredient;

    @Column(name = "RECIPE", nullable = false, length = 4000)
    private String recipe;
}