import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { theme } from '../theme';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline';
    loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ title, variant = 'primary', loading, style, ...props }) => {
    const getBackgroundColor = () => {
        if (variant === 'primary') return theme.colors.primary;
        if (variant === 'secondary') return theme.colors.secondary;
        return 'transparent';
    };

    const getTextColor = () => {
        if (variant === 'primary') return theme.colors.white;
        if (variant === 'secondary') return theme.colors.primary;
        return theme.colors.primary;
    };

    const getBorder = () => {
        if (variant === 'outline') return { borderWidth: 1, borderColor: theme.colors.primary };
        return {};
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { backgroundColor: getBackgroundColor(), borderRadius: theme.borderRadius.s },
                getBorder(),
                style,
            ]}
            disabled={loading}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: theme.spacing.m,
        paddingHorizontal: theme.spacing.l,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    text: {
        fontSize: theme.textVariants.button.fontSize as number,
        fontWeight: theme.textVariants.button.fontWeight as any,
    },
});
