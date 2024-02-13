import React, { Fragment, ReactNode, useEffect, useRef, useState } from 'react'
import * as monaco from 'monaco-editor'
import { attachPart, Parts, onPartVisibilityChange, registerCustomView, ViewContainerLocation, CustomViewOption, isPartVisibile } from '@codingame/monaco-vscode-views-service-override'
import { createPortal } from 'react-dom'
import { initializePromise } from '@codingame/monaco-editor-wrapper'
import { DisposableStore } from 'vscode/monaco'

interface CustomView extends Omit<CustomViewOption, 'renderBody' | 'location' | 'actions'> {
  node: ReactNode
  actions?: (Omit<NonNullable<CustomViewOption['actions']>[0], 'render'> & {
    node?: ReactNode
  })[]
}

export interface VscodePartRendererProps {
  views?: CustomView[]
  className?: string
  style?: React.CSSProperties
}

function createPart (part: Parts, location: ViewContainerLocation | null) {
  const element = document.createElement('div')
  element.style.flex = '1'
  element.style.minWidth = '0'

  initializePromise.then(() => {
    attachPart(part, element)
  }, console.error)

  let counter = 0

  function getViewId (id: string, counter: number) {
    if (counter > 0) {
      return `${id}-${counter}`
    }
    return id
  }

  return function VscodePartRenderer ({ views = [], className, style }: VscodePartRendererProps) {
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
      ref.current?.append(element)
    }, [])

    const [renderCounter] = useState(() => counter++)

    const [portalComponents, setPortalComponents] = useState({} as Record<string, HTMLElement>)

    const [visible, setVisible] = useState(isPartVisibile(part))

    useEffect(() => {
      const disposable = onPartVisibilityChange(part, setVisible)
      return () => {
        disposable.dispose()
      }
    }, [])

    useEffect(() => {
      if (location == null) {
        return
      }
      const disposableStore = new DisposableStore()
      for (const view of views) {
        disposableStore.add(registerCustomView({
          id: getViewId(view.id, renderCounter),
          name: view.name,
          order: view.order,
          renderBody: function (container: HTMLElement): monaco.IDisposable {
            setPortalComponents(portalComponents => ({
              ...portalComponents,
              [view.id]: container
            }))

            return {
              dispose () {
                setPortalComponents(portalComponents => {
                  const { [view.id]: _, ...remaining } = portalComponents
                  return remaining
                })
              }
            }
          },
          location,
          icon: view.icon,
          actions: view.actions?.map(action => {
            return {
              ...action,
              render: action.node != null
                ? (container) => {
                    setPortalComponents(portalComponents => ({
                      ...portalComponents,
                      [action.id]: container
                    }))

                    return {
                      dispose () {
                        setPortalComponents(portalComponents => {
                          const { [action.id]: _, ...remaining } = portalComponents
                          return remaining
                        })
                      }
                    }
                  }
                : undefined
            }
          })
        }))
      }
      return () => {
        disposableStore.dispose()
      }
    }, [renderCounter, views])

    return (
      <>
        {views.filter(view => view.id in portalComponents).map((view) => {
          return (
            <Fragment key={view.id}>
              {createPortal(
                view.node,
                portalComponents[view.id]!,
                view.id
              )}
              {view.actions?.filter(action => action.id in portalComponents).map(action => (
                <Fragment key={action.id}>
                  {createPortal(
                    action.node,
                    portalComponents[action.id]!,
                    action.id
                  )}
                </Fragment>
              ))}
            </Fragment>
          )
        })}
        <div
          ref={ref} className={className} style={{
            display: visible ? 'flex' : 'none',
            alignItems: 'stretch',
            justifyContent: 'stretch',
            ...style
          }}
        />
      </>
    )
  }
}

export const SidebarPart = createPart(Parts.SIDEBAR_PART, ViewContainerLocation.Sidebar)
export const ActivitybarPart = createPart(Parts.ACTIVITYBAR_PART, null)
export const EditorPart = createPart(Parts.EDITOR_PART, null)
export const StatusBarPart = createPart(Parts.STATUSBAR_PART, null)
export const PanelPart = createPart(Parts.PANEL_PART, ViewContainerLocation.Panel)
export const AuxiliaryPart = createPart(Parts.AUXILIARYBAR_PART, ViewContainerLocation.AuxiliaryBar)
export const TitlebarPart = createPart(Parts.TITLEBAR_PART, null)
export const BannerPart = createPart(Parts.BANNER_PART, null)

export type { CustomView }
