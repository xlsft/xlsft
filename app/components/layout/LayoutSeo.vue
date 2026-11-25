<script setup lang="ts">
    import { useCmsStore } from '~/stores/cms'

    const theme = useColorMode()
    const config = useRuntimeConfig().public
    const cmsStore = useCmsStore()

    const { data } = await cmsStore.person()

    if (data.value) useSeoMeta({
        titleTemplate: chunk => `${data.value?.title ?? ''}${chunk ? ` — ${chunk}` : ''}`,
        themeColor: config.theme.background[theme.value as 'dark' | 'light'],
    })

    if (data.value) useSchemaOrg([
        definePerson({
            name: config.schema.person.fullname,
            givenName: config.schema.person.firstname,
            familyName: config.schema.person.lastname,
            alternateName: config.schema.person.initials,
            image: data.value?.image,
            description: data.value?.description,
            jobTitle: config.schema.person.position,
            telephone: data.value?.phone,
            email: data.value?.email,
            url: config.site.url,
            sameAs: data.value?.links,
            worksFor: defineOrganization({
                name: data.value?.workplace?.name,
                url: data.value?.workplace?.link,
                logo: data.value?.workplace?.logo
            }),
            knowsAbout: data.value?.skills?.flatMap((skill: any) => ({
                '@type': 'Thing',
                name: skill.name
            })) ?? [],
            hasOccupation: data.value?.experience?.map((company: any) => company.positions?.map((position: any) => ({
                '@type': 'Occupation',
                name: position.name,
                description: company.about,
                responsibilities: position.description,
                skills: position.skills?.map((skill: any) => skill.name),
                startDate: position.duration?.from,
                endDate: position.duration?.to ?? undefined,
                organization: defineOrganization({
                    name: company.name,
                    url: company.link ?? undefined,
                    logo: company.logo ?? undefined
                })
            }))),
        }),
        defineItemList({
            name: 'Проекты',
            itemListElement: data.value?.projects?.sort((a: any, b: any) => b.priority - a.priority).map((project: any, index: number) => ({
                '@type': project.repo ? 'SoftwareSourceCode' : 'CreativeWork',
                position: index + 1,
                name: project.name,
                codeRepository: project.repo ? `https://github.com/${project.repo}` : undefined,
                url: `${config.site.url}/ru/projects/${project.id}`,
                thumbnailUrl: project.thumbnail,
                description: project.description
            }))
        }),
        defineOrganization({
            name: config.schema.organization.name,
            legalName: config.schema.organization.legalName,
            legalAddress: config.schema.organization.legalAddress,
            url: config.schema.organization.url,
            email: config.schema.organization.email,
            logo: config.schema.organization.logo,
            telephone: config.schema.organization.phone
        })
    ])
</script>

<template>
    <slot/>
</template>
