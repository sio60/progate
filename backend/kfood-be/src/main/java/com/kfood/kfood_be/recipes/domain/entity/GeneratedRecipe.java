package com.kfood.kfood_be.recipes.domain.entity;

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

@Entity
@Table(name = "generated_recipe")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeneratedRecipe {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "recipe_seq")
    @SequenceGenerator(name = "recipe_seq", sequenceName = "RECIPE_SEQ", allocationSize = 1)
    private Long id;

    @Column(nullable = false)
    private String food;

    @Column(nullable = false)
    private String ingredient;

    @Column(length = 4000, nullable = false)
    private String recipe;
}
