# Copyright 2024 by Andrew G. Lemons - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited
# Proprietary and confidential

FROM node:20-slim as base

#########
# Setup #
#########

# Install PNPM
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install packages
RUN apt-get -y update && \
	apt-get -y install openssl && \
	apt-get -y install docker.io && \
	apt-get clean && \
	rm -rf /var/lib/apt/lists/*

#########
# Build #
#########

FROM base AS build

# Copy project files
COPY . /app
WORKDIR /app

# Install all dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install

# Run prisma generate
RUN pnpm run prisma:generate
# Run build
RUN pnpm run build

########
# Main #
########

FROM base AS main

# Copy project files
COPY . /app
# Copy build
COPY --from=build /app/dist /app/dist

# Move to app directory
WORKDIR /app

# Install all dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod

#######
# Run #
#######

EXPOSE 80
CMD [ "sh", "start.sh" ]
