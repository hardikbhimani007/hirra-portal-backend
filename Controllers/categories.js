const Category = require('../models/categories');
const { Op } = require("sequelize");
const Sequelize = require('sequelize');

const createCategory = async (req, res) => {
    try {
        const { trade, skills } = req.body;

        if (!trade) {
            return res.status(400).json({ success: false, message: 'Trade is required' });
        }

        const category = await Category.create({ trade, skills });
        return res.status(201).json({
            success: true,
            message: 'Category created successfully!',
            data: category
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

const getCategories = async (req, res) => {
    try {
        let { page, search } = req.query;
        page = parseInt(page) || 1;
        const limit = 12;
        const offset = (page - 1) * limit;

        const whereClause = search
            ? {
                [Op.or]: [
                    Sequelize.where(
                        Sequelize.fn('LOWER', Sequelize.col('trade')),
                        'LIKE',
                        `%${search.toLowerCase()}%`
                    ),
                    Sequelize.where(
                        Sequelize.fn('LOWER', Sequelize.col('skills')),
                        'LIKE',
                        `%${search.toLowerCase()}%`
                    )
                ]
            }
            : {};

        const { rows: categories, count: total } = await Category.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [['id', 'DESC']]
        });

        const categoriesWithCount = categories.map(cat => {
            const skillsArray = cat.skills ? cat.skills.split(',').map(s => s.trim()) : [];
            return {
                ...cat.toJSON(),
                skills_count: skillsArray.length
            };
        });

        return res.status(200).json({
            success: true,
            message: 'Categories fetched successfully!',
            data: categoriesWithCount,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

const getAllCategories = async (req, res) => {
    try {
        const { search } = req.query;

        const whereClause = search
            ? {
                [Op.or]: [
                    Sequelize.where(
                        Sequelize.fn('LOWER', Sequelize.col('trade')),
                        'LIKE',
                        `%${search.toLowerCase()}%`
                    ),
                    Sequelize.where(
                        Sequelize.fn('LOWER', Sequelize.col('skills')),
                        'LIKE',
                        `%${search.toLowerCase()}%`
                    )
                ]
            }
            : {};

        // Fetch all categories, no pagination
        const categories = await Category.findAll({
            where: whereClause,
            attributes: ['trade', 'skills'],
            order: [['id', 'DESC']]
        });

        // Convert skills string to array
        const formattedCategories = categories.map(cat => ({
            trade: cat.trade,
            skills: cat.skills
                ? cat.skills.split(',').map(s => s.trim())
                : []
        }));

        return res.status(200).json({
            success: true,
            message: 'Categories fetched successfully!',
            data: formattedCategories
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

const updateCategory = async (req, res) => {
    try {
        const { id, trade, skills } = req.body;

        const category = await Category.findByPk(id);
        if (!category) {
            return res.status(200).json({ success: false, message: 'Category not found' });
        }

        await category.update({ trade, skills });
        return res.status(200).json({
            success: true,
            message: 'Category updated successfully!',
            data: category
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findByPk(id);

        if (!category) {
            return res.status(200).json({ success: false, message: 'Category not found' });
        }

        await category.destroy();
        return res.status(200).json({
            success: true,
            message: 'Category deleted successfully!'
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    createCategory,
    getCategories,
    getAllCategories,
    updateCategory,
    deleteCategory,
};
