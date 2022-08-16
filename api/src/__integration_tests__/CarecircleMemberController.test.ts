import { Knex } from 'knex';
import Koa from 'koa';
import { Affiliation } from '../models/CarecircleMember';
import { IPlwd } from 'src/models/Plwd';
import { IUser } from 'src/models/User';
import { CarecircleMemberRepository } from 'src/repositories/CarecircleMemberRepository';
import { PlwdRepository } from 'src/repositories/PlwdRepository';
import { UserRepository } from 'src/repositories/UserRepository';
import request from 'supertest';
import { initTestSetup, MockAuthorizationHeaderTransform } from './IntegrationTestUtils';
import { StartedPostgisContainer } from './PostgisContainer';
import {
    caretakerMembership,
    membershipWithManagePermissions,
    membershipWithNoPermissions,
    membershipWithReadOnlyPermissions,
} from './seed-data/carecircleMembership';
import { adminUser, carecircleMemberUser, caretakerUser, plwdUser } from './seed-data/users';

let app: Koa;
let container: StartedPostgisContainer;
let carecircleMemberRepository: CarecircleMemberRepository;
let userRepository: UserRepository;
let plwdRepository: PlwdRepository;
let jwt: MockAuthorizationHeaderTransform;
let caretaker: IUser;
let admin: IUser;
let carecircleMember: IUser;
let plwd: IPlwd;
let database: Knex;

beforeAll(async () => {
    ({
        app,
        container,
        database,
        repositories: { carecircleMemberRepository, plwdRepository, userRepository },
        mockJwtHandler: jwt,
    } = await initTestSetup());
});

beforeEach(async () => {
    carecircleMember = await userRepository.insert(carecircleMemberUser);
    admin = await userRepository.insert(adminUser);
    caretaker = await userRepository.insert(caretakerUser);
    plwd = await plwdRepository.insert({ ...plwdUser, caretakerId: caretaker.id });
});

afterEach(async () => {
    await plwdRepository.deleteById(plwd.id);
    await userRepository.deleteById(carecircleMember.id);
    await userRepository.deleteById(admin.id);
    await userRepository.deleteById(caretaker.id);
});

afterAll(async () => {
    await database.destroy();
    await container.stop();
});

describe('CarecircleMemberController', () => {
    it('Should allow an admin to access the carecircle', async () => {
        await jwt.loginAs(admin.auth0Id);

        const membership = {
            ...membershipWithNoPermissions,
            plwdId: plwd.id,
            userId: caretaker.id,
        };
        await carecircleMemberRepository.addMember(membership);

        const response = await request(app.callback()).get(`/carecircle-members/${plwd.id}`);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);
        expect(response.body.data).toHaveLength(1);

        const [member] = response.body.data;
        expect(member.affiliation).toEqual(membership.affiliation);
        expect(member.id).toEqual(membership.id);
        expect(member.permissions).toEqual(JSON.parse(membership.permissions));
        expect(member.user.id).toEqual(membership.userId);

        await carecircleMemberRepository.removeMemberByUserId(membership.plwdId, caretaker.id);
    });

    it('Should allow a caretaker to access the carecircle', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const membership = {
            ...membershipWithNoPermissions,
            plwdId: plwd.id,
            userId: caretaker.id,
        };
        await carecircleMemberRepository.addMember(membership);

        const response = await request(app.callback()).get(`/carecircle-members/${plwd.id}`);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);
        expect(response.body.data).toHaveLength(1);

        const [member] = response.body.data;
        expect(member.affiliation).toEqual(membership.affiliation);
        expect(member.id).toEqual(membership.id);
        expect(member.permissions).toEqual(JSON.parse(membership.permissions));
        expect(member.user.id).toEqual(membership.userId);

        await carecircleMemberRepository.removeMemberByUserId(membership.plwdId, caretaker.id);
    });

    it('Should allow a carecircle member to access the carecircle with read permission', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        const membership = {
            ...membershipWithReadOnlyPermissions,
            plwdId: plwd.id,
            userId: carecircleMember.id,
        };
        await carecircleMemberRepository.addMember(membership);

        const response = await request(app.callback()).get(`/carecircle-members/${plwd.id}`);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);
        expect(response.body.data).toHaveLength(1);

        const [member] = response.body.data;
        expect(member.affiliation).toEqual(membership.affiliation);
        expect(member.id).toEqual(membership.id);
        expect(member.permissions).toEqual(JSON.parse(membership.permissions));
        expect(member.user.id).toEqual(membership.userId);

        await carecircleMemberRepository.removeMemberByUserId(membership.plwdId, carecircleMember.id);
    });

    it('Should allow a carecircle member to access the carecircle with manage permission', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        const membership = {
            ...membershipWithManagePermissions,
            plwdId: plwd.id,
            userId: carecircleMember.id,
        };
        await carecircleMemberRepository.addMember(membership);

        const response = await request(app.callback()).get(`/carecircle-members/${plwd.id}`);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);
        expect(response.body.data).toHaveLength(1);

        const [member] = response.body.data;
        expect(member.affiliation).toEqual(membership.affiliation);
        expect(member.id).toEqual(membership.id);
        expect(member.permissions).toEqual(JSON.parse(membership.permissions));
        expect(member.user.id).toEqual(membership.userId);

        await carecircleMemberRepository.removeMemberByUserId(membership.plwdId, carecircleMember.id);
    });

    it('Should not allow a carecircle member to access the carecircle without read permission', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        const membership = {
            ...membershipWithNoPermissions,
            plwdId: plwd.id,
            userId: carecircleMember.id,
        };
        await carecircleMemberRepository.addMember(membership);

        const response = await request(app.callback()).get(`/carecircle-members/${plwd.id}`);

        expect(response.status).toEqual(403);

        await carecircleMemberRepository.removeMemberByUserId(membership.plwdId, carecircleMember.id);
    });

    it('Should allow an admin to add a member to the carecircle', async () => {
        await jwt.loginAs(admin.auth0Id);

        const data = {
            affiliation: Affiliation.FAMILY,
            permissions: JSON.stringify([]),
            user: {
                email: 'test.user@gmail.com',
                firstName: 'Test',
                lastName: 'User',
                phone: '+32477665544',
                picture: '',
            },
        };

        const response = await request(app.callback()).post(`/carecircle-member/${plwd.id}`).send(data);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const carecircleMembers = await carecircleMemberRepository.getMembers(plwd.id);
        expect(carecircleMembers).toHaveLength(1);
        await carecircleMemberRepository.removeMemberByUserId(plwd.id, response.body.data.userId);
    });

    it('Should allow a caretaker to add a member to the carecircle', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const data = {
            affiliation: Affiliation.FAMILY,
            permissions: JSON.stringify([]),
            user: {
                email: 'test.user@gmail.com',
                firstName: 'Test',
                lastName: 'User',
                phone: '+32477665544',
                picture: '',
            },
        };

        const response = await request(app.callback()).post(`/carecircle-member/${plwd.id}`).send(data);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const carecircleMembers = await carecircleMemberRepository.getMembers(plwd.id);
        expect(carecircleMembers).toHaveLength(1);
        await carecircleMemberRepository.removeMemberByUserId(plwd.id, response.body.data.userId);
    });

    it('Should allow a carecircle member to add a member to the carecircle with manage permissions', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        const membership = {
            ...membershipWithManagePermissions,
            plwdId: plwd.id,
            userId: carecircleMember.id,
        };
        await carecircleMemberRepository.addMember(membership);

        const data = {
            affiliation: Affiliation.FAMILY,
            permissions: JSON.stringify([]),
            user: {
                email: 'test.user@gmail.com',
                firstName: 'Test',
                lastName: 'User',
                phone: '+32477665544',
                picture: '',
            },
        };

        const response = await request(app.callback()).post(`/carecircle-member/${plwd.id}`).send(data);

        expect(response.status).toEqual(200);
        expect(response.body.success).toEqual(true);

        const carecircleMembers = await carecircleMemberRepository.getMembers(plwd.id);
        expect(carecircleMembers).toHaveLength(2);

        await carecircleMemberRepository.removeMemberByUserId(plwd.id, response.body.data.userId);
        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });

    it('Should not allow a carecircle member to add a member to the carecircle with read permissions', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        const membership = {
            ...membershipWithReadOnlyPermissions,
            plwdId: plwd.id,
            userId: carecircleMember.id,
        };
        await carecircleMemberRepository.addMember(membership);

        const data = {
            affiliation: Affiliation.FAMILY,
            permissions: JSON.stringify([]),
            user: {
                email: 'test.user@gmail.com',
                firstName: 'Test',
                lastName: 'User',
                phone: '+32477665544',
                picture: '',
            },
        };

        const response = await request(app.callback()).post(`/carecircle-member/${plwd.id}`).send(data);

        expect(response.status).toEqual(403);

        const carecircleMembers = await carecircleMemberRepository.getMembers(plwd.id);
        expect(carecircleMembers).toHaveLength(1);

        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });

    it('Should not allow a carecircle member to add a member to the carecircle with no permissions', async () => {
        await jwt.loginAs(carecircleMember.auth0Id);

        const membership = {
            ...membershipWithNoPermissions,
            plwdId: plwd.id,
            userId: carecircleMember.id,
        };
        await carecircleMemberRepository.addMember(membership);

        const data = {
            affiliation: Affiliation.FAMILY,
            permissions: JSON.stringify([]),
            user: {
                email: 'test.user@gmail.com',
                firstName: 'Test',
                lastName: 'User',
                phone: '+32477665544',
                picture: '',
            },
        };

        const response = await request(app.callback()).post(`/carecircle-member/${plwd.id}`).send(data);

        expect(response.status).toEqual(403);

        const carecircleMembers = await carecircleMemberRepository.getMembers(plwd.id);
        expect(carecircleMembers).toHaveLength(1);

        await carecircleMemberRepository.removeMemberByUserId(plwd.id, carecircleMember.id);
    });

    it('Should allow a caretaker to delete a member from the carecircle', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const data = {
            affiliation: Affiliation.FAMILY,
            permissions: JSON.stringify([]),
            user: {
                email: 'test.user@gmail.com',
                firstName: 'Test',
                lastName: 'User',
                phone: '+32477665544',
                picture: '',
            },
        };

        const createResponse = await request(app.callback()).post(`/carecircle-member/${plwd.id}`).send(data);
        expect(createResponse.status).toEqual(200);
        expect(createResponse.body.success).toEqual(true);

        const [carecircleMember] = await carecircleMemberRepository.getMembers(plwd.id);

        const deleteResponse = await request(app.callback())
            .del(`/carecircle-member/${plwd.id}/${carecircleMember.id}`)
            .send(data);
        expect(deleteResponse.status).toEqual(200);
        expect(deleteResponse.body.success).toEqual(true);
    });

    it('Should allow a caretaker to update/patch a member from the carecircle', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const data = {
            addUserToCarecircle: true,
            affiliation: Affiliation.FAMILY,
            permissions: JSON.stringify(['manage:carecircle']),
            user: {
                email: 'test.user@gmail.com',
                firstName: 'Test',
                lastName: 'User',
                phone: '+32477665544',
                picture: '',
            },
        };

        const createResponse = await request(app.callback()).post(`/carecircle-member/${plwd.id}`).send(data);
        expect(createResponse.status).toEqual(200);
        expect(createResponse.body.success).toEqual(true);
        const [carecircleMember] = await carecircleMemberRepository.getMembers(plwd.id);

        const patchedCarecircleMemberData = {
            addUserToCarecircle: true,
            affiliation: Affiliation.FRIEND,
            permissions: JSON.stringify([]),
            user: {
                ...data.user,
                id: carecircleMember.user.id,
            },
        };
        const patchResponse = await request(app.callback())
            .patch(`/carecircle-member/${plwd.id}/${carecircleMember.id}`)
            .send(patchedCarecircleMemberData);
        expect(patchResponse.status).toEqual(200);
        expect(patchResponse.body.success).toEqual(true);

        const patchedCarecircleMembers = await carecircleMemberRepository.getMembers(plwd.id);
        expect(patchedCarecircleMembers).toHaveLength(1);
        const [patchedCarecircleMember] = patchedCarecircleMembers;
        expect(patchedCarecircleMember.affiliation).toEqual(patchedCarecircleMemberData.affiliation);
        expect(patchedCarecircleMember.permissions).toEqual([]);

        const deleteResponse = await request(app.callback()).del(
            `/carecircle-member/${plwd.id}/${carecircleMember.id}`
        );
        expect(deleteResponse.status).toEqual(200);
        expect(deleteResponse.body.success).toEqual(true);
    });

    it('Should not allow to update a non-existent carecircle member', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const data = {
            affiliation: Affiliation.FAMILY,
            permissions: JSON.stringify(['manage:carecircle']),
            user: carecircleMember,
        };

        const response = await request(app.callback())
            .patch(`/carecircle-member/${plwd.id}/nonexistentuserid`)
            .send(data);

        expect(response.status).toEqual(500);
        expect(response.body.success).toEqual(false);
    });

    it('Should not allow to update the email of the user linked to a carecircle member', async () => {
        await jwt.loginAs(caretaker.auth0Id);

        const data = {
            addUserToCarecircle: true,
            affiliation: Affiliation.FAMILY,
            permissions: JSON.stringify(['manage:carecircle']),
            user: {
                email: 'test.user@gmail.com',
                firstName: 'Test',
                lastName: 'User',
                phone: '+32477665544',
                picture: '',
            },
        };

        const createResponse = await request(app.callback()).post(`/carecircle-member/${plwd.id}`).send(data);
        expect(createResponse.status).toEqual(200);
        expect(createResponse.body.success).toEqual(true);
        const [carecircleMember] = await carecircleMemberRepository.getMembers(plwd.id);

        const patchedCarecircleMemberData = {
            addUserToCarecircle: true,
            affiliation: Affiliation.FRIEND,
            permissions: JSON.stringify([]),
            user: {
                ...data.user,
                id: carecircleMember.user.id,
                email: 'ichangedyouremail@haha.com',
            },
        };
        const patchResponse = await request(app.callback())
            .patch(`/carecircle-member/${plwd.id}/${carecircleMember.id}`)
            .send(patchedCarecircleMemberData);
        expect(patchResponse.status).toEqual(409);

        const deleteResponse = await request(app.callback()).del(
            `/carecircle-member/${plwd.id}/${carecircleMember.id}`
        );
        expect(deleteResponse.status).toEqual(200);
        expect(deleteResponse.body.success).toEqual(true);
    });

    it('Should not allow anyone to delete a primary caretaker from the carecircle', async () => {
        await jwt.loginAs(admin.auth0Id);

        await carecircleMemberRepository.addMember({
            ...caretakerMembership,
            userId: caretaker.id,
            plwdId: plwd.id,
        });
        const createdCaretakerMembership = await carecircleMemberRepository.getByUserIdAndPlwdId(caretaker.id, plwd.id);

        const deleteResponse = await request(app.callback()).del(
            `/carecircle-member/${plwd.id}/${createdCaretakerMembership.id}`
        );
        expect(deleteResponse.status).toEqual(403);
        expect(deleteResponse.text).toEqual('Not allowed to delete a primary caretaker from a carecirlce');

        await carecircleMemberRepository.removeMemberByUserId(plwd.id, caretaker.id);
    });
});
