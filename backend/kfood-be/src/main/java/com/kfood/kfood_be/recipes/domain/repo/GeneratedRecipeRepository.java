package com.kfood.kfood_be.recipes.domain.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.kfood.kfood_be.recipes.domain.entity.GeneratedRecipe;

@Repository
public interface GeneratedRecipeRepository extends JpaRepository<GeneratedRecipe, Long> {
}

