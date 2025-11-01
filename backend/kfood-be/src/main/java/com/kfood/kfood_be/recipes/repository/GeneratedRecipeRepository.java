package com.kfood.kfood_be.recipes.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.kfood.kfood_be.recipes.entity.GeneratedRecipeEntity;

@Repository
public interface GeneratedRecipeRepository extends JpaRepository<GeneratedRecipeEntity, Long> {
}

