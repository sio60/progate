package com.kfood.kfood_be.recipes.domain.repo;

import com.kfood.kfood_be.recipes.domain.entity.GeneratedRecipe;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GeneratedRecipeRepository extends JpaRepository<GeneratedRecipe, Long> {}
