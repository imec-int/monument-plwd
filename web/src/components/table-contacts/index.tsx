import { Avatar } from '@components';
import { useMedia } from 'react-use';

interface ITableContacts {
  register: any;
  fields: any;
}

export const TableContacts: React.FC<ITableContacts> = ({
  register,
  fields,
}) => {
  const isDesktop = useMedia('(min-width: 1024px)');

  return (
    <div>
      {isDesktop ? (
        <div className="overflow-x-auto w-full hidden lg:block">
          <table className="table w-full">
            <thead>
              <tr>
                <th></th>
                <th></th>
                <th>Name</th>
                <th>Affiliation</th>
                <th>Email</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((c: any, i: number) => (
                <tr key={i}>
                  <th>
                    <label>
                      <input
                        {...register(`contacts[${i}].checked`)}
                        className="checkbox"
                        type="checkbox"
                      />
                    </label>
                  </th>
                  <td>
                    <Avatar
                      firstName={c.user.firstName}
                      lastName={c.user.lastName}
                      picture={c.user.picture}
                    />
                  </td>
                  <td>
                    {c.user.firstName} {c.user.lastName}
                  </td>
                  <td>{c.affiliation}</td>
                  <td>{c.user.email}</td>
                  <td>{c.user.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto w-full flex flex-col mt-4 gap-4 block lg:hidden">
          {fields.map((c: any, i: number) => (
            <div
              className="w-full bg-base-100 overflow-scroll border-b pb-4"
              key={i}
            >
              <div className="flex flex-row items-center">
                <label className="mr-4">
                  <input
                    {...register(`contacts[${i}].checked`)}
                    className="checkbox"
                    type="checkbox"
                  />
                </label>
                <div className="flex flex-row">
                  <Avatar
                    firstName={c.user.firstName}
                    lastName={c.user.lastName}
                    picture={c.user.picture}
                  />
                  <div className="flex flex-col ml-4">
                    <div className="text-lg font-bold">
                      {c.user.firstName} {c.user.lastName}
                    </div>
                    <div className="text-base font-normal">{c.affiliation}</div>
                    <div className="text-base font-normal">{c.user.email}</div>
                    <div className="text-base font-normal">{c.user.phone}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
