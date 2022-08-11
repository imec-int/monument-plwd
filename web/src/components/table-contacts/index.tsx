import { Avatar } from '@components';

interface ITableContacts {
  register: any;
  fields: any;
}

export const TableContacts: React.FC<ITableContacts> = ({
  register,
  fields,
}) => {
  return (
    <div className="overflow-x-auto w-full">
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
  );
};
