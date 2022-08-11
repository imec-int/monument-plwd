/**
 *  @type {import("eslint").Linter.Config}
 */
module.exports = {
  extends: [
    'next/core-web-vitals',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  plugins: ['@typescript-eslint', 'simple-import-sort'],
  rules: {
    'react/jsx-props-no-spreading': 'off',
    'react/jsx-sort-props': 'warn',
    // "simple-import-sort" takes care of this
    'sort-imports': 'off',
    'import/order': 'off',
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    'newline-before-return': 'warn',
    '@typescript-eslint/no-var-requires': 0,
  },
};
