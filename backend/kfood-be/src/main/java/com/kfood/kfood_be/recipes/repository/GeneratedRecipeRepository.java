package com.kfood.kfood_be.recipes.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.kfood.kfood_be.recipes.entity.GeneratedRecipeEntity;

import java.util.List;

@Repository
public interface GeneratedRecipeRepository extends JpaRepository<GeneratedRecipeEntity, Long> {
    List<GeneratedRecipeEntity> findByIngredientIgnoreCase(String ingredient);
    List<GeneratedRecipeEntity> findByIngredientContainingIgnoreCase(String ingredient);
    List<GeneratedRecipeEntity> findByFoodIgnoreCase(String food);
}