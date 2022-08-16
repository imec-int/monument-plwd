const mapOldToNew = (carecircle) => {
    const permissions = carecircle.permissions ?? [];
    if (!permissions.length || permissions.length === 0) {
        return {
            ...carecircle,
            permissions: ['when-assigned:locations', 'never:calendar', 'never:carecircle'],
        };
    }

    const permissionsValues = permissions.map((p) => p.value);
    const [locationPermission, calendarPermission, carecirclePermission] = permissionsValues;

    const updateCalendarPermission = (permission) => {
        if (permission === '') {
            return 'never:calendar';
        }

        return permission;
    };

    const updateCarecirclePermission = (permission) => {
        if (permission === '') {
            return 'never:carecircle';
        }

        return permission;
    };

    const updateLocationPermission = (permission) => {
        if (permission === 'manage:locations') {
            return 'always:locations';
        }

        return 'when-assigned:locations';
    };

    return {
        ...carecircle,
        permissions: [
            updateLocationPermission(locationPermission),
            updateCalendarPermission(calendarPermission),
            updateCarecirclePermission(carecirclePermission),
        ],
    };
};

exports.up = async function (knex) {
    const carecircles = await knex('carecircle_members').select('id', 'permissions');
    const updatedCarecircles = carecircles.map(mapOldToNew);
    for await (const updatedCarecircle of updatedCarecircles) {
        await knex('carecircle_members')
            .update({ permissions: JSON.stringify(updatedCarecircle.permissions) })
            .where('id', updatedCarecircle.id);
    }
};

exports.down = async function (knex) {
    // Do nothing
};
