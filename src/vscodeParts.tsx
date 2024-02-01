import React, { Fragment, ReactNode, useEffect, useRef, useState } from 'react'
import * as monaco from 'monaco-editor'
import { renderSidebarPart, renderActivitybarPar, renderEditorPart, renderPanelPart, renderStatusBarPart, registerCustomView, ViewContainerLocation, CustomViewOption } from '@codingame/monaco-vscode-views-service-override/views'
import { createPortal } from 'react-dom'
import { initializePromise } from '@codingame/monaco-editor-wrapper'
import { DisposableStore } from 'vscode/monaco'

interface CustomView extends Omit<CustomViewOption, 'renderBody' | 'location' | 'actions'> {
  node: ReactNode
  actions?: (Omit<NonNullable<CustomViewOption['actions']>[0], 'render'> & {
    node?: ReactNode
  })[]
}

interface VscodePartRendererProps {
  views?: CustomView[]
  className?: string
  style?: React.CSSProperties
}

function createPart (location: ViewContainerLocation | null, renderPart: (container: HTMLElement) => monaco.IDisposable) {
  const element = document.createElement('div')
  element.style.flex = '1'
  element.style.minWidth = '0'

  initializePromise.then(() => {
    renderPart(element)
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
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'stretch',
            ...style
          }}
        />
      </>
    )
  }
}

export const SidebarPart = createPart(ViewContainerLocation.Sidebar, renderSidebarPart)
export const ActivitybarPart = createPart(null, renderActivitybarPar)
export const EditorPart = createPart(null, renderEditorPart)
export const StatusBarPart = createPart(null, renderStatusBarPart)
export const PanelPart = createPart(ViewContainerLocation.Panel, renderPanelPart)

export type { CustomView }
