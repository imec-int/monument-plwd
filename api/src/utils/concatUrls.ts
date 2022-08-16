function tail(path: string) {
    if (path?.length <= 1) {
        return '';
    }

    return path.substring(1, path.length);
}

export const concatUrls = (base: string, ...paths: string[]) => {
    if (paths.length === 0) {
        return base;
    }

    const firstPaths = paths[0];
    const nextPaths = paths.slice(1, paths.length);

    if (base.endsWith('/') && firstPaths.startsWith('/')) {
        return concatUrls(base + tail(firstPaths), ...nextPaths);
    } else if (!base.endsWith('/') && !firstPaths.startsWith('/')) {
        return concatUrls(base + '/' + firstPaths, ...nextPaths);
    }
    return concatUrls(base + firstPaths, ...nextPaths);
};
