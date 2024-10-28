# Ocean Print Server

## Environment

| Variable              | Description                                           | Example                                               |
| --------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| `DATABASE_URL`        | The URL of the PostgreSQL database.                   | `postgresql://postgres:password@localhost:5432/ocean` |
| `SERVER_PORT`         | The port which the HTTP server will be accessible on. | `80`                                                  |
| `DATA_UPLOADS_DIR`    | The directory where uploaded data will be stored.     | `/data/uploads`                                       |
| `DATA_THUMBNAILS_DIR` | The directory where thumbnail data will be stored.    | `/data/thumbnails`                                    |
| `RECEIPTS_HOST`       | The host of the receipts printer.                     | `192.168.68.1`                                        |
| `RECEIPTS_MODEL`      | The model of the receipts printer.                    | `BROTHER QL-810W`                                     |

## License

Ocean Print Queuing System

Copyright (C) 2024 Andrew Lemons

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
