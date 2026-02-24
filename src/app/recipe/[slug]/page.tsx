'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import IngredientList from '@/components/IngredientList';
import MantraCard from '@/components/MantraCard';
import { vedicMantras } from '@/data/vedic-mantras';
import { getRecipeBySlug } from '@/lib/api';
import { Clock, Users, Flame, ChefHat, ScrollText, Languages } from 'lucide-react';
import styles from './recipe.module.css';
import RecipeHeroImage from '@/components/RecipeHeroImage';
import { Recipe, BilingualString } from '@/lib/types';

export default function RecipePage() {
    const params = useParams();
    const slug = params.slug as string;
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [lang, setLang] = useState<'hi' | 'en'>('hi');

    useEffect(() => {
        const found = getRecipeBySlug(slug);
        setRecipe(found || null);
    }, [slug]);

    if (!recipe && recipe !== null) return null; // Loading
    if (recipe === null) {
        notFound();
        return null;
    }

    const getText = (field: BilingualString) => {
        if (!field) return '';
        if (typeof field === 'string') return field;
        return field[lang] || field['hi'] || '';
    };

    return (
        <main style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh' }}>

            <div className={styles.container}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    <button
                        onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--glass-bg)', backdropFilter: 'blur(8px)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '0.5rem 1rem', borderRadius: '12px', cursor: 'pointer', boxShadow: 'var(--shadow-card-light)' }}
                    >
                        <Languages size={18} color="var(--accent-amber)" />
                        {lang === 'hi' ? 'English' : 'हिन्दी'}
                    </button>
                </div>

                <div className={styles.headerGrid}>
                    {/* Hero Image Section */}
                    <div className={styles.heroImageWrapper}>
                        <RecipeHeroImage
                            src={recipe.images?.hero || ''}
                            alt={getText(recipe.title)}
                            title={getText(recipe.title)}
                            className={styles.heroImage}
                        />
                        <div className={styles.overlay}>
                            <span className={styles.regionTag}>{getText(recipe.region)}</span>
                            <h1 className={styles.title}>{getText(recipe.title)}</h1>
                        </div>
                    </div>

                    {/* Right Column: Stats & Blessing */}
                    <div>
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <Clock size={24} color="var(--accent-amber)" />
                                <span className={styles.statValue}>{recipe.prepTime + recipe.cookTime}</span>
                                <span className={styles.statLabel}>Minutes</span>
                            </div>
                            <div className={styles.statCard}>
                                <Users size={24} color="var(--accent-amber)" />
                                <span className={styles.statValue}>{recipe.servings}</span>
                                <span className={styles.statLabel}>Servings</span>
                            </div>
                            <div className={styles.statCard}>
                                <ChefHat size={24} color="var(--accent-amber)" />
                                <span className={styles.statValue}>{recipe.difficulty}</span>
                                <span className={styles.statLabel}>Level</span>
                            </div>
                        </div>

                        <div style={{ margin: '2rem 0' }}>
                            <MantraCard mantra={vedicMantras.brahmarpanam} />
                        </div>

                        <div className={styles.heritageSection}>
                            <h3 className={styles.sectionTitle}>
                                <ScrollText size={20} /> Heritage Story
                            </h3>
                            <p className={styles.storyText}>{getText(recipe.heritageStory)}</p>
                        </div>
                    </div>
                </div>

                <div className={styles.contentGrid}>
                    {/* Left: Ingredients & Nutrition */}
                    <div>
                        <h3 className={styles.sectionTitle}>Ingredients</h3>
                        <div className={styles.ingredientsList}>
                            {recipe.ingredients.map((ing, i) => (
                                <div key={i} className={styles.ingredientItem} style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                                    <span style={{ fontWeight: '600' }}>{getText(ing.name)}</span>
                                    <span style={{ color: 'var(--text-muted)' }}> - {ing.quantity}</span>
                                </div>
                            ))}
                        </div>

                        {recipe.nutrition && (
                            <div className={styles.nutritionCard} style={{ marginTop: '2rem' }}>
                                <h3 className={styles.sectionTitle}>
                                    <Flame size={20} color="var(--accent-amber)" />
                                    Nutritional Info
                                </h3>
                                <div className={styles.nutriGrid}>
                                    <div className={styles.nutriItem}>
                                        <span className={styles.nutriValue}>{recipe.nutrition.calories}</span>
                                        <span className={styles.nutriLabel}>Calories</span>
                                    </div>
                                    <div className={styles.nutriItem}>
                                        <span className={styles.nutriValue}>{recipe.nutrition.protein}g</span>
                                        <span className={styles.nutriLabel}>Protein</span>
                                    </div>
                                    <div className={styles.nutriItem}>
                                        <span className={styles.nutriValue}>{recipe.nutrition.carbs}g</span>
                                        <span className={styles.nutriLabel}>Carbs</span>
                                    </div>
                                    <div className={styles.nutriItem}>
                                        <span className={styles.nutriValue}>{recipe.nutrition.fats}g</span>
                                        <span className={styles.nutriLabel}>Fats</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Steps */}
                    <div className={styles.stepsContainer}>
                        <h3 className={styles.sectionTitle}>Method</h3>
                        <div>
                            {(Array.isArray(recipe.instructions)
                                ? recipe.instructions
                                : (recipe.instructions[lang] || recipe.instructions['hi'] || [])
                            ).map((step, index) => (
                                <div key={index} className={styles.step}>
                                    <div className={styles.stepNumber}>{index + 1}</div>
                                    <p className={styles.stepText}>{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
