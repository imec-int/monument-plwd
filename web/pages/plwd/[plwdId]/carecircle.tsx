import { withPageAuthRequired } from '@auth0/nextjs-auth0';
import {
  Avatar,
  Container,
  DeleteButton,
  EditButton,
  Header,
  ModalContact,
  ModalContactDelete,
} from '@components';
import { LayoutWithAppContext } from '@components/layouts/LayoutWithAppContext';
import { Affiliation } from '@constants';
import { EmptyIUser, ICarecircleMember } from '@interfaces';
import { fetchWrapper } from 'lib/fetch';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import { ReactElement, useEffect, useState } from 'react';
import { useAppUserContext } from 'src/hooks/useAppUserContext';
import { useCarecircle } from 'src/hooks/useCarecircle';
import { usePermissions } from 'src/hooks/usePermissions';
import { mutate } from 'swr';

export const getServerSideProps = withPageAuthRequired();

const Carecircle = () => {
  const { plwd } = useAppUserContext();
  const { canAccessCarecircle, canManageCarecircle } = usePermissions();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [selectedContact, setSelectedContact] = useState<
    ICarecircleMember | EmptyIUser | null
  >(null);
  const [contactToDelete, setContactToDelete] =
    useState<ICarecircleMember | null>(null);

  const { data: users = [] } = useCarecircle(plwd.id);

  useEffect(() => {
    if (!canAccessCarecircle) {
      router.push(`/plwd/${plwd.id}`);
    }
  }, [router, canAccessCarecircle, plwd]);

  const getUsers = async () => {
    await mutate(`/api/carecircle-members/${plwd.id}`);
  };

  const onCloseDeleteModal = () => {
    setContactToDelete(null);
  };

  const deleteUser = async (id: string) => {
    await fetchWrapper(`/api/carecircle-members/${plwd.id}/${id}`, {
      method: 'DELETE',
    })
      .then(async () => {
        enqueueSnackbar(
          `Successfully deleted contact ${contactToDelete?.user?.firstName} ${contactToDelete?.user?.lastName}`,
          {
            variant: 'success',
          }
        );
        await getUsers();
        onCloseDeleteModal();
      })
      .catch(() => {
        enqueueSnackbar(
          `Failed to delete contact ${contactToDelete?.user?.firstName} ${contactToDelete?.user?.lastName}`,
          {
            variant: 'error',
          }
        );
        onCloseDeleteModal();
      });
  };

  const onAddNewContactCallback = () => {
    setSelectedContact({});
  };

  const onEditContactCallback = (contact: ICarecircleMember) => {
    setSelectedContact(contact);
  };

  const onDeleteContactCallback = (contact: ICarecircleMember) => {
    setContactToDelete(contact);
  };

  const onCloseModalContact = () => {
    setSelectedContact(null);
  };

  if (!canAccessCarecircle) return null;

  return (
    <Container>
      <Header tabTitle="Monument - Carecircle" />
      {selectedContact ? (
        <ModalContact
          getUsers={getUsers}
          onClose={onCloseModalContact}
          selectedContact={selectedContact}
        />
      ) : null}
      <div className="card w-full bg-base-100 shadow-xl overflow-scroll">
        <div className="card-body">
          <h2 className="card-title">Carecircle</h2>
          {canManageCarecircle ? (
            <a
              className="btn btn-secondary w-48 my-2"
              onClick={onAddNewContactCallback}
            >
              Add new contact
            </a>
          ) : null}
          <div className="hidden lg:block">
            <table className="table w-full">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Affiliation</th>
                  {canManageCarecircle ? <th></th> : null}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={i}>
                    <td>
                      <Avatar
                        firstName={u.user.firstName}
                        lastName={u.user.lastName}
                        picture={u.user.picture}
                      />
                    </td>
                    <td>
                      {u.user.firstName} {u.user.lastName}
                    </td>
                    <td>{u.user.phone}</td>
                    <td>{u.user.email}</td>
                    <td>{u.affiliation}</td>
                    {canManageCarecircle &&
                    u.affiliation !== Affiliation.PRIMARY_CARETAKER ? (
                      <td>
                        <EditButton
                          className="mr-2"
                          onClick={() => onEditContactCallback(u)}
                        />
                        <DeleteButton
                          className="btn-error"
                          onClick={() => onDeleteContactCallback(u)}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="block lg:hidden mt-4 flex flex-col gap-4">
        {users.map((u, i) => (
          <div
            className="card w-full bg-base-100 shadow-xl overflow-scroll"
            key={i}
          >
            <div className="card-body">
              <div className="flex flex-row justify-between">
                <div className="flex flex-row">
                  <Avatar
                    firstName={u.user.firstName}
                    lastName={u.user.lastName}
                    picture={u.user.picture}
                  />
                  <div className="flex flex-col ml-4">
                    <div className="flex flex-col">
                      <h2 className="card-title mb-2">
                        {u.user.firstName} {u.user.lastName}
                      </h2>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="card-subtitle text-base-content text-opacity-50">
                        {u.user.phone}
                      </p>
                      <p className="card-subtitle text-base-content text-opacity-50">
                        {u.user.email}
                      </p>
                      <p className="card-subtitle text-base-content text-opacity-50">
                        {u.affiliation}
                      </p>
                    </div>
                    {canManageCarecircle &&
                    u.affiliation !== Affiliation.PRIMARY_CARETAKER ? (
                      <div className="flex flex-row mt-4">
                        <EditButton
                          className="mr-2"
                          onClick={() => onEditContactCallback(u)}
                        />
                        <DeleteButton
                          className="btn-error"
                          onClick={() => onDeleteContactCallback(u)}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {contactToDelete ? (
        <ModalContactDelete
          action={async () => deleteUser(contactToDelete.id)}
          contact={contactToDelete}
          onClose={onCloseDeleteModal}
        />
      ) : null}
    </Container>
  );
};

Carecircle.getLayout = function getLayout(page: ReactElement) {
  return <LayoutWithAppContext>{page}</LayoutWithAppContext>;
};

export default Carecircle;
